// supabase/functions/get-streak/index.ts
/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />
import dayjs from 'https://esm.sh/dayjs@1'
import utc from 'https://esm.sh/dayjs@1/plugin/utc'
import tz from 'https://esm.sh/dayjs@1/plugin/timezone'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
dayjs.extend(utc); dayjs.extend(tz);

// ====== CORS ======
const ORIGIN = Deno.env.get('CORS_ORIGIN') || '*';
const CORS = {
  'access-control-allow-origin': ORIGIN,
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'GET, OPTIONS',
  'content-type': 'application/json',
};
const ok  = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: CORS });
const bad = (body: unknown, status = 400) => new Response(JSON.stringify(body), { status, headers: CORS });

// ====== メモ内訳のパース（get-user-week と同じ科目集合） ======
const SUBJECT_ORDER = ['数学','英語','国語','理科','社会','情報','宿題','その他'] as const;
function parseMemoToSums(memo: string | null | undefined) {
  const sums: Record<string, number> = {};
  if (!memo) return { sums };
  const subjGroup = (SUBJECT_ORDER as readonly string[]).join('|');
  const reAll = new RegExp(`(?:^|[^一-龥A-Za-z0-9_])(${subjGroup})\\s*[：:]\\s*(\\d{1,4})\\s*分`, 'g');
  let m: RegExpExecArray | null;
  while ((m = reAll.exec(memo)) !== null) {
    const subj = m[1]; const min = Number(m[2] || 0);
    if (min > 0) sums[subj] = (sums[subj] ?? 0) + min;
  }
  return { sums };
}

export const handler = async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    const url = new URL(req.url);
    const qUserId = url.searchParams.get('user_id') ?? undefined;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey =
      Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !serviceKey) {
      return bad({ error: 'Missing SUPABASE_URL or SERVICE_ROLE_KEY' }, 500);
    }
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 認証ユーザー or 明示 user_id
    let user_id = qUserId;
    if (!user_id) {
      const auth = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
      if (!auth) return bad({ error: 'user_id or Authorization required' }, 401);
      // 認証トークンから user id を取得
      const { data: me, error: meErr } = await admin.auth.getUser(auth);
      if (meErr || !me?.user?.id) return bad({ error: 'Invalid JWT' }, 401);
      user_id = me.user.id;
    }

    // 1) v_leaderboard から streak / rank / grade
    const { data: cur, error: e1 } = await admin
      .from('v_leaderboard')
      .select('user_id, streak_days, rank_label, grade')
      .eq('user_id', user_id)
      .maybeSingle();

    if (e1) return bad({ error: e1.message }, 500);

    // 2) 直近7日合計（JST、当日を含む7日：KnowUserのラベルと合わせる）
    const todayJST = dayjs().tz('Asia/Tokyo').format('YYYY-MM-DD');
    const since7   = dayjs(todayJST).subtract(6, 'day').format('YYYY-MM-DD');

    const { data: logs, error: e2 } = await admin
      .from('study_logs')
      .select('study_date, subject, minutes, memo')
      .eq('user_id', user_id)
      .gte('study_date', since7)
      .lte('study_date', todayJST);

    if (e2) return bad({ error: e2.message }, 500);

    // メモ内訳があればそれを優先、無ければ minutes を加算
    let sum7 = 0;
    for (const r of (logs ?? [])) {
      const { sums } = parseMemoToSums((r as any).memo);
      const hasBreakdown = Object.keys(sums).length > 0;
      if (hasBreakdown) {
        sum7 += Object.values(sums).reduce((a, b) => a + (Number(b) || 0), 0);
      } else {
        sum7 += Number((r as any).minutes || 0);
      }
    }

    return ok({
      user_id,
      grade: cur?.grade ?? null,
      streak_days: Number(cur?.streak_days ?? 0),
      rank_label: String(cur?.rank_label ?? 'I'),
      sum7,
      today: todayJST,
    });
  } catch (e: any) {
    return bad({ error: String(e?.message || e) }, 500);
  }
}

Deno.serve(handler);
