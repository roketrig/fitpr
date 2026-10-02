// Supabase Edge Function: send-push
//
// Notifies the other person in a coach/student pair. The caller says what
// happened ("event") and, when it's the coach acting, which student — the
// recipient is always worked out here from the coach/student link, never
// taken from the request, so nobody can push arbitrary messages at arbitrary
// users. Delivery goes through Expo's push service.
//
// Needs no secrets of its own: SUPABASE_URL, SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY are injected by the Supabase runtime.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type Lang = 'en' | 'tr';
type Event = 'checkin_comment' | 'food_review' | 'target_updated' | 'checkin_submitted';

const COACH_EVENTS: Event[] = ['checkin_comment', 'food_review', 'target_updated'];

const MESSAGES: Record<Event, Record<Lang, { title: string; body: string }>> = {
  checkin_comment: {
    en: { title: 'New comment from your coach', body: '{name} commented on your check-in.' },
    tr: { title: 'Koçundan yeni yorum', body: '{name} form gönderine yorum yazdı.' },
  },
  food_review: {
    en: { title: 'Your food log was reviewed', body: '{name} reviewed one of your meals.' },
    tr: { title: 'Yemek günlüğün incelendi', body: '{name} öğünlerinden birini değerlendirdi.' },
  },
  target_updated: {
    en: { title: 'Nutrition target updated', body: '{name} set your new calorie and protein target.' },
    tr: { title: 'Beslenme hedefin güncellendi', body: '{name} yeni kalori ve protein hedefini belirledi.' },
  },
  checkin_submitted: {
    en: { title: 'New check-in', body: '{name} sent their progress check-in.' },
    tr: { title: 'Yeni form geldi', body: '{name} ilerleme formunu gönderdi.' },
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ success: false, error: 'Missing Authorization header' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const callerClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) return json({ success: false, error: 'Not authenticated' }, 401);
    const callerId = userData.user.id;

    const { event, studentId } = (await req.json()) as { event?: Event; studentId?: string };
    if (!event || !MESSAGES[event]) return json({ success: false, error: 'Unknown event' }, 400);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    let recipientId: string;
    if (COACH_EVENTS.includes(event)) {
      if (!studentId) return json({ success: false, error: 'studentId required' }, 400);
      const { data: link } = await admin
        .from('pt_student_links')
        .select('pt_id')
        .eq('student_id', studentId)
        .eq('pt_id', callerId)
        .maybeSingle();
      if (!link) return json({ success: false, error: 'Not this student\'s coach' }, 403);
      recipientId = studentId;
    } else {
      const { data: link } = await admin
        .from('pt_student_links')
        .select('pt_id')
        .eq('student_id', callerId)
        .maybeSingle();
      if (!link) return json({ success: true, sent: 0 });
      recipientId = link.pt_id;
    }

    const [{ data: sender }, { data: recipient }, { data: tokens }] = await Promise.all([
      admin.from('profiles').select('display_name').eq('id', callerId).maybeSingle(),
      admin.from('profiles').select('language').eq('id', recipientId).maybeSingle(),
      admin.from('push_tokens').select('token').eq('user_id', recipientId),
    ]);
    if (!tokens || tokens.length === 0) return json({ success: true, sent: 0 });

    const lang: Lang = recipient?.language === 'tr' ? 'tr' : 'en';
    const name = sender?.display_name || (lang === 'tr' ? 'Koçun' : 'Your coach');
    const template = MESSAGES[event][lang];
    const messages = tokens.map((t: { token: string }) => ({
      to: t.token,
      title: template.title,
      body: template.body.replace('{name}', name),
      sound: 'default',
      channelId: 'default',
      data: { event },
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    const result = await res.json();

    // Drop tokens Expo says no longer exist (app uninstalled / token rotated).
    const tickets: { status: string; details?: { error?: string } }[] = result.data ?? [];
    const dead = tokens
      .filter((_: unknown, i: number) => tickets[i]?.details?.error === 'DeviceNotRegistered')
      .map((t: { token: string }) => t.token);
    if (dead.length > 0) await admin.from('push_tokens').delete().in('token', dead);

    return json({ success: true, sent: tokens.length - dead.length });
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
