import { Platform } from 'react-native';

export type AuthRedirect =
  | { kind: 'confirmed' }
  | { kind: 'recovery'; accessToken: string | null; refreshToken: string | null }
  | { kind: 'error' };

function paramsOf(): URLSearchParams {
  const raw = window.location.hash.replace(/^#/, '') + '&' + window.location.search.replace(/^\?/, '');
  return new URLSearchParams(raw);
}

// Supabase email links land on the web deployment carrying their result in
// the URL (implicit flow): a success has type=signup|recovery|..., an
// expired or already-used link has error=... instead. Anything else is a
// normal visit.
export function detectAuthRedirect(): AuthRedirect | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const params = paramsOf();

  if (params.has('error') || params.has('error_code') || params.has('error_description')) {
    return { kind: 'error' };
  }

  const type = params.get('type');
  if (type === 'recovery') {
    return { kind: 'recovery', accessToken: params.get('access_token'), refreshToken: params.get('refresh_token') };
  }
  if (type && ['signup', 'invite', 'magiclink', 'email_change'].includes(type)) {
    return { kind: 'confirmed' };
  }
  return null;
}
