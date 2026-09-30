import { supabase } from './supabase';

// Same product id registered in both Play Console (a subscription with this
// base plan/product id) and App Store Connect (a subscription with this
// product id) — the two stores have independent namespaces, so reusing the
// string is just a convenience, not a requirement.
export const PT_SUBSCRIPTION_SKU = 'pt_monthly';

interface VerifyPurchasePayload {
  platform: 'android' | 'ios';
  productId: string;
  purchaseToken: string;
  transactionId?: string | null;
  environment?: string | null;
}

export interface VerifyPurchaseResult {
  success: boolean;
  status?: string;
  currentPeriodEnd?: string | null;
  error?: string;
}

// Sends a just-completed store purchase to our own Supabase edge function,
// which re-checks it directly with Google/Apple before granting access —
// the client's word that "I paid" is never trusted on its own.
export async function verifyPurchaseOnServer(payload: VerifyPurchasePayload): Promise<VerifyPurchaseResult> {
  const { data, error } = await supabase.functions.invoke('verify-purchase', { body: payload });
  if (error) return { success: false, error: error.message };
  return data as VerifyPurchaseResult;
}
