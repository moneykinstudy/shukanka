/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />
import dayjs from 'https://esm.sh/dayjs@1'
import utc from 'https://esm.sh/dayjs@1/plugin/utc'
import tz from 'https://esm.sh/dayjs@1/plugin/timezone'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
dayjs.extend(utc); dayjs.extend(tz);

const SUBJECT_ORDER = ['数学','英語','国語','理科','社会','情報','宿題','その他'] as const

// ===== CORS =====
const ORIGIN = Deno.env.get('CORS_ORIGIN') || '*'
const CORS = {
  'access-control-allow-origin': ORIGIN,
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'GET, OPTIONS',
  'content-type': 'application/json',
  'cache-control': 'no-store',
}
const ok  = (b: unknown, s=200) => new Response(JSON.stringify(b), { status: s, headers: CORS })
const bad = (b: unknown, s=400) => new Response(JSON.stringify(b), { status: s, headers: CORS })

function parseMemo(memo?: string | null) {
  const sums: Record<string, number> = {}
  if (!memo) return { sums, freeNote: '' }

  const subjGroup = (SUBJECT_ORDER as readonly string[]).join('|')
  const reAll = new RegExp(`(?:^|[^一-龥A-Za-z0-9_])(${subjGroup})\\s*[：:]\\s*(\\d{1,4})\\s*分`, 'g')
  let m: RegExpExecArray | null
  while ((m = reAll.exec(memo)) !== null) {
    const subj = m[1]; const min = Number(m[2] || 0)
    if (min > 0) sums[subj] = (sums[subj] ?? 0) + min
  }

  const cutIdx = memo.search(/(^|\n)\s*内訳\s*[：:]/)
  const freeSrc = cutIdx >= 0 ? memo.slice(0, cutIdx) : memo
  const free = freeSrc
    .split(/\r?\n/)
    .map(line => line.replace(/\s+$/,''))
    .join('\n')
    .trim()

  return { sums, freeNote: free }
}

export const handler = async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  try {
    const url = new URL(req.url)
    const qUserId = url.searchParams.get('user_id') ?? undefined

    // ★ 環境変数は SUPABASE_URL を優先、なければ PROJECT_URL でも可
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROJECT_URL') ?? ''
    const serviceKey  = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (!supabaseUrl || !serviceKey) {
      return bad({ error: 'Missing SUPABASE_URL/PROJECT_URL or SERVICE_ROLE_KEY' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // 対象ユーザー
    let user_id = qUserId
    if (!user_id) {
      const auth = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
      if (!auth) return bad({ error: 'user_id or Authorization required' }, 401)
      const { data: me, error: meErr } = await admin.auth.getUser(auth)
      if (meErr || !me?.user?.id) return bad({ error: 'Invalid JWT' }, 401)
      user_id = me.user.id
    }

    // ===== 「今日までの7日」（JST、当日含む） =====
    const today = dayjs().tz('Asia/Tokyo').startOf('day')
    const end   = today                    // 末尾 = 今日
    const start = end.subtract(6, 'day')   // 先頭 = 今日-6日

    const startStr = start.format('YYYY-MM-DD')
    const endStr   = end.format('YYYY-MM-DD')

    // ベース配列（DBが空でも7件並ぶ）
    const days: string[] = []
    for (let d = start.clone(); !d.isAfter(end); d = d.add(1, 'day')) {
      days.push(d.format('YYYY-MM-DD'))
    }

    // ログ取得
    const { data: logs, error: e } = await admin
      .from('study_logs')
      .select('study_date, subject, minutes, memo')
      .eq('user_id', user_id)
      .gte('study_date', startStr)
      .lte('study_date', endStr)

    if (e) return bad({ error: e.message }, 500)

    // 集計：日付ごとに { sums: 科目別分, memo?: freeNote } を作成
    const byDate: Record<string, { sums: Record<string, number>, memo?: string }> = {}
    for (const d of days) byDate[d] = { sums: {}, memo: undefined }

    for (const r of (logs ?? [])) {
      const d = (r as any).study_date
      if (!byDate.hasOwnProperty(d)) continue

      const { sums: memoSums, freeNote } = parseMemo((r as any).memo)
      const hasBreakdown = Object.keys(memoSums).length > 0

      // ① memo 内訳が無い行だけ subject/minutes を加算
      if (!hasBreakdown && (r as any).subject && Number((r as any).minutes || 0) > 0) {
        const subj = String((r as any).subject)
        const min  = Number((r as any).minutes || 0)
        byDate[d].sums[subj] = (byDate[d].sums[subj] ?? 0) + min
      }

      // ② memo 内訳は常に加算
      for (const subj of Object.keys(memoSums)) {
        byDate[d].sums[subj] = (byDate[d].sums[subj] ?? 0) + memoSums[subj]
      }

      // ③ freeNote があれば本文として採用
      if (freeNote) byDate[d].memo = freeNote
    }

    return ok({ days, byDate })
  } catch (err: any) {
    return bad({ error: String(err?.message || err) }, 500)
  }
}

Deno.serve(handler)
