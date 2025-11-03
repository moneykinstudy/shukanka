// supabase/functions/plan-web-notifications/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const REST = Deno.env.get('https://dmudbmvvsiofbupptnis.supabase.co') + '/rest/v1';
const HEAD = {
  apikey: Deno.env.get('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtdWRibXZ2c2lvZmJ1cHB0bmlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODExNzIzMSwiZXhwIjoyMDczNjkzMjMxfQ.rQDiLtCSuYAikcC-NuVlX-LK2guea_ac4EsJPd4JfHY')!,
  Authorization: `Bearer ${Deno.env.get('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtdWRibXZ2c2lvZmJ1cHB0bmlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODExNzIzMSwiZXhwIjoyMDczNjkzMjMxfQ.rQDiLtCSuYAikcC-NuVlX-LK2guea_ac4EsJPd4JfHY')!}`,
};

function inJST(d: Date) { return new Date(d.getTime() + 9*60*60*1000); }
function JSTtoUTCISO(y:number,m:number,d:number,h:number,min:number) {
  // JST(UTC+9) → UTC
  const dt = new Date(Date.UTC(y, m-1, d, h-9, min));
  return dt.toISOString();
}
function pick(min:number, max:number) { return min + Math.floor(Math.random()*(max-min)); }

serve(async () => {
  // 今日（JST）の日付と曜日
  const nowJST = inJST(new Date());
  const y = nowJST.getUTCFullYear(), m = nowJST.getUTCMonth()+1, d = nowJST.getUTCDate();
  const dow = nowJST.getUTCDay(); // 0..6 （JST基準）
  // 祝日判定：テーブルにあれば祝日扱い
  const ymd = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const hq = await fetch(`${REST}/jp_holidays?select=ymd&ymd=eq.${ymd}`, { headers: HEAD });
  const isHoliday = (await hq.json() as any[]).length > 0;
  const isWeekend = (dow===0 || dow===6) || isHoliday;

  const windows = isWeekend
    ? [ ['we_09_10',   9*60, 10*60],
        ['we_13_14',  13*60, 14*60],
        ['we_19_20',  19*60, 20*60], ]
    : [ ['wk_16_30_17_30', 16*60+30, 17*60+30],
        ['wk_19_20',       19*60,    20*60],
        ['wk_21_22',       21*60,    22*60], ];

  // 当日提出済みユーザーを除外するため、提出済み一覧を先に取得
  const todayStart = `${ymd} 00:00:00+09`; // JST
  const todayEnd   = `${ymd} 23:59:59+09`;
  // study_logs.study_date が date 型なら eq で ymd 判定、timestamp 型なら between などに合わせる
  const logsRes = await fetch(`${REST}/study_logs?select=user_id,study_date&study_date=eq.${ymd}`, { headers: HEAD });
  const submitted = new Set<string>((await logsRes.json() as any[]).map(r => r.user_id));

  // トークンがある（＝通知対象になりうる）ユーザー一覧
  const tokRes = await fetch(`${REST}/push_tokens?select=user_id&distinct=user_id`, { headers: HEAD });
  const users = Array.from(new Set(((await tokRes.json()) as any[]).map(r => r.user_id)));

  for (const uid of users) {
    if (submitted.has(uid)) continue; // 当日提出済みはスキップ

    for (const [label, startMin, endMin] of windows) {
      const mm = pick(startMin, endMin);   // 上限は含まないが ±1分は誤差許容
      const hh = Math.floor(mm/60);
      const mi = mm % 60;
      const scheduledAtUTC = JSTtoUTCISO(y,m,d,hh,mi);

      // 既に同じ時刻があればスキップ
      const exQ = new URLSearchParams({ user_id: `eq.${uid}`, scheduled_at: `eq.${scheduledAtUTC}` });
      const exR = await fetch(`${REST}/user_push_schedule?${exQ}`, { headers: HEAD });
      const existed = await exR.json() as any[];
      if (existed.length) continue;

      await fetch(`${REST}/user_push_schedule`, {
        method:'POST',
        headers: { ...HEAD, 'Content-Type':'application/json' },
        body: JSON.stringify({ user_id: uid, scheduled_at: scheduledAtUTC, window_label: label }),
      });
    }
  }

  return new Response('ok');
});