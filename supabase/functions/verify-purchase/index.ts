// Supabase Edge Function: verify-purchase
//
// Called by the app right after a store purchase completes. Never trusts
// the client's "I paid" claim on its own — it re-checks the purchase
// directly with Google Play / Apple's server APIs, and only then marks the
// PT's subscription active in `pt_subscriptions` (using the service role
// key, which bypasses RLS — this function is the only writer of that
// table's status besides `become_pt()`'s initial trial row).
//
// Required secrets (Supabase Dashboard → Edge Functions → verify-purchase →
// Secrets, or `supabase secrets set`):
//   ANDROID_PACKAGE_NAME            e.g. com.fitpr.app
//   GOOGLE_SERVICE_ACCOUNT_EMAIL    from a Play Console service account JSON key
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY   same JSON key's "private_key" field
//   APPLE_BUNDLE_ID                 e.g. com.fitpr.app
//   APPLE_ISSUER_ID                 from App Store Connect → Users and Access → Keys
//   APPLE_KEY_ID                    the App Store Server API key's Key ID
//   APPLE_PRIVATE_KEY               the .p8 key's contents
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// the Supabase runtime — don't set those yourself.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://esm.sh/jose@5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface VerifyResult {
  valid: boolean;
  expiryMs: number | null;
  transactionId: string;
}

async function getGoogleAccessToken(): Promise<string> {
  const clientEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKeyPem = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')?.replace(/\\n/g, '\n');
  if (!clientEmail || !privateKeyPem) throw new Error('Google service account secrets are not configured');

  const privateKey = await jose.importPKCS8(privateKeyPem, 'RS256');
  const assertion = await new jose.SignJWT({ scope: 'https://www.googleapis.com/auth/androidpublisher' })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google OAuth token exchange failed: ${JSON.stringify(data)}`);
  return data.access_token as string;
}

async function verifyAndroidPurchase(productId: string, purchaseToken: string): Promise<VerifyResult> {
  const packageName = Deno.env.get('ANDROID_PACKAGE_NAME') ?? 'com.fitpr.app';
  const accessToken = await getGoogleAccessToken();

  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}` +
    `/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json();
  if (!res.ok) return { valid: false, expiryMs: null, transactionId: purchaseToken };

  const lineItem = (data.lineItems ?? []).find((li: { productId?: string }) => li.productId === productId) ??
    data.lineItems?.[0];
  const state = data.subscriptionState as string | undefined;
  const isActive = state === 'SUBSCRIPTION_STATE_ACTIVE' || state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD';
  const expiryMs = lineItem?.expiryTime ? new Date(lineItem.expiryTime).getTime() : null;

  return { valid: Boolean(isActive && lineItem), expiryMs, transactionId: purchaseToken };
}

async function getAppleJWT(): Promise<string> {
  const issuerId = Deno.env.get('APPLE_ISSUER_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const privateKeyPem = Deno.env.get('APPLE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
  if (!issuerId || !keyId || !privateKeyPem) throw new Error('Apple App Store Server API secrets are not configured');

  const privateKey = await jose.importPKCS8(privateKeyPem, 'ES256');
  return new jose.SignJWT({ bid: Deno.env.get('APPLE_BUNDLE_ID') ?? 'com.fitpr.app' })
    .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
    .setIssuer(issuerId)
    .setIssuedAt()
    .setExpirationTime('1h')
    .setAudience('appstoreconnect-v1')
    .sign(privateKey);
}

async function verifyApplePurchase(
  productId: string,
  transactionId: string,
  environment?: string | null
): Promise<VerifyResult> {
  const jwt = await getAppleJWT();
  const base =
    environment === 'Sandbox'
      ? 'https://api.storekit-sandbox.itunes.apple.com'
      : 'https://api.storekit.itunes.apple.com';

  const res = await fetch(`${base}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const data = await res.json();
  if (!res.ok || !data.signedTransactionInfo) return { valid: false, expiryMs: null, transactionId };

  // signedTransactionInfo is a JWS we just fetched directly from Apple over
  // an authenticated HTTPS call — decoding it without re-verifying the
  // signature is safe here because Apple's own API is the trust boundary,
  // not client-supplied data.
  const payload = jose.decodeJwt(data.signedTransactionInfo) as {
    productId?: string;
    expiresDate?: number;
    revocationDate?: number;
    transactionId?: string;
  };

  const isActive =
    payload.productId === productId && !payload.revocationDate && (!payload.expiresDate || payload.expiresDate > Date.now());

  return { valid: isActive, expiryMs: payload.expiresDate ?? null, transactionId: payload.transactionId ?? transactionId };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ success: false, error: 'Missing Authorization header' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) return jsonResponse({ success: false, error: 'Not authenticated' }, 401);
    const ptId = userData.user.id;

    const body = await req.json();
    const platform = body.platform as 'android' | 'ios';
    const productId = body.productId as string;
    const purchaseToken = body.purchaseToken as string;
    const transactionId = body.transactionId as string | undefined;
    const environment = body.environment as string | null | undefined;

    if (!platform || !productId || !purchaseToken) {
      return jsonResponse({ success: false, error: 'Missing platform, productId, or purchaseToken' }, 400);
    }

    const result =
      platform === 'android'
        ? await verifyAndroidPurchase(productId, purchaseToken)
        : await verifyApplePurchase(productId, transactionId ?? purchaseToken, environment);

    if (!result.valid) {
      return jsonResponse({ success: false, error: 'Purchase could not be verified as active' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const currentPeriodEnd = result.expiryMs ? new Date(result.expiryMs).toISOString() : null;
    const { error: upsertError } = await admin.from('pt_subscriptions').upsert(
      {
        pt_id: ptId,
        status: 'active',
        platform,
        store_product_id: productId,
        store_transaction_id: result.transactionId,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pt_id' }
    );
    if (upsertError) return jsonResponse({ success: false, error: upsertError.message }, 500);

    return jsonResponse({ success: true, status: 'active', currentPeriodEnd });
  } catch (e) {
    return jsonResponse({ success: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
