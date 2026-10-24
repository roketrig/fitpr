// The web deployment that Supabase's Auth "Site URL" points at. Confirmation
// and password-reset emails send people here; App.tsx recognises those links
// and shows a plain "you're set" / "choose a new password" page.
export const WEB_APP_URL = 'https://fitpr.vercel.app';
export const PRIVACY_URL = `${WEB_APP_URL}/privacy.html`;
