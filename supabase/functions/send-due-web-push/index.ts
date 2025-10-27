// supabase/functions/send-due-web-push/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
const REST = Deno.env.get('https://dmudbmvvsiofbupptnis.supabase.co') + '/rest/v1';
const HEAD = {
  apikey: Deno.env.get('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtdWRibXZ2c2lvZmJ1cHB0bmlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODExNzIzMSwiZXhwIjoyMDczNjkzMjMxfQ.rQDiLtCSuYAikcC-NuVlX-LK2guea_ac4EsJPd4JfHY')!,
  Authorization: `Bearer ${Deno.env.get('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtdWRibXZ2c2lvZmJ1cHB0bmlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODExNzIzMSwiZXhwIjoyMDczNjkzMjMxfQ.rQDiLtCSuYAikcC-NuVlX-LK2guea_ac4EsJPd4JfHY')!}`,
};
const FCM = 'https://fcm.googleapis.com/fcm/send';
const FCM_KEY = Deno.env.get('BL9rw0-fD04WA7GcjxSdS8Q9oEJl3BxOVmVPkaU1sK_FqcpDg5NTkrr3XUl7sHohIMwlVq386qOZ5LrBcdl82GM')!;

function toJSTiso(d: Date) { return new Date(d.getTime() + 9*60*60*1000); }
function isoYmdJST(d: Date) {
  const j = toJSTiso(d);
  const y = j.getUTCFullYear(), m=j.getUTCMonth()+1, dd=j.getUTCDate();
  return `${y}-${String(m).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
}

serve( async () => {
  const now = new Date().toISOString();

  const q = new URLSearchParams({
    select: 'id,user_id,scheduled_at,window_label',
    sent_at: 'is.null',
    scheduled_at: `lte.${now}`,
    order: 'scheduled_at.asc',
    limit: '1000',
  });
  const r = await fetch(`${REST}/user_push_schedule?${q}`, { headers: HEAD });
  const due = await r.json() as { id:number; user_id:string }[];
  if (!due.length) return new Response('no-due');

  // 必要なユーザーのトークン
  const ids = Array.from(new Set(due.map(x => x.user_id)));
  const rt = await fetch(`${REST}/push_tokens?select=user_id,token&user_id=in.(${ids.join(',')})`, { headers: HEAD });
  const allToks = await rt.json() as {user_id:string; token:string}[];

  // 今日提出済みユーザー
  const ymd = isoYmdJST(new Date()); // JST yyyy-mm-dd
  const lr = await fetch(`${REST}/study_logs?select=user_id&study_date=eq.${ymd}`, { headers: HEAD });
  const submitted = new Set<string>((await lr.json() as any[]).map(r => r.user_id));

  for (const s of due) {
    const userTokens = allToks.filter(t => t.user_id === s.user_id).map(t => t.token);
    // 二重ガード：提出済みは送らず済扱い
    if (!userTokens.length || submitted.has(s.user_id)) {
      await fetch(`${REST}/user_push_schedule?id=eq.${s.id}`, {
        method:'PATCH',
        headers:{ ...HEAD, 'Content-Type':'application/json' },
        body: JSON.stringify({ sent_at: new Date().toISOString() }),
      });
      continue;
    }

    const notif = { title: '1分以内に学習再開！', body: '勉強を再開して23時59分までに今日の学習記録を提出しよう！' };
    const data  = { deeplink: '/today' };

    // まとめて送る（registration_ids）
    await fetch(FCM, {
      method:'POST',
      headers: { 'Content-Type':'application/json', 'Authorization': `key=${FCM_KEY}` },
      body: JSON.stringify({
        registration_ids: userTokens,
        notification: notif,
        data,
        priority: 'high',
      }),
    });

    await fetch(`${REST}/user_push_schedule?id=eq.${s.id}`, {
      method:'PATCH',
      headers:{ ...HEAD, 'Content-Type':'application/json' },
      body: JSON.stringify({ sent_at: new Date().toISOString() }),
    });
  }

  return new Response('ok');
});
