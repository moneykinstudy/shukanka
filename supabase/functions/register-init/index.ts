/**
 * register-init: Safe wrapper
 * - Deno.serve（必ず1レスポンスを返す）
 * - CORS 明示
 * - 入力バリデーション
 * - 例外/未処理awaitを捕捉して JSON で返す
 * - 極力タイムアウトで固まらない（withTimeout）
 */

const ALLOW_ORIGIN = 'http://localhost:8081';

// 共通ヘッダ
const baseHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': ALLOW_ORIGIN,
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
} as const;

function json(body: any, status = 200, extra?: Record<string,string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...baseHeaders, ...(extra ?? {}) } });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidCode(code: string) {
  // 任意: 6桁数字などにしているなら調整
  return typeof code === 'string' && code.length > 0 && code.length <= 20;
}

function redact(s?: string) {
  if (!s) return s;
  return s.length > 8 ? s.slice(0,4) + '...' + s.slice(-2) : s;
}

async function withTimeout<T>(p: Promise<T>, ms = 9000): Promise<T> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort('TIMEOUT'), ms);
  try {
    // p が fetch 系なら signal を渡すと良いが、ここはラッパーだけ保持
    return await p;
  } finally {
    clearTimeout(to);
  }
}

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: baseHeaders });
  }
  if (req.method !== 'POST') {
    return json({ ok:false, error:'method_not_allowed' }, 405);
  }

  // 入力読み取り（サイズ簡易制限）
  let bodyText = '';
  try {
    bodyText = await withTimeout(req.text(), 3000);
    if (bodyText.length > 64 * 1024) {
      return json({ ok:false, error:'payload_too_large' }, 413);
    }
  } catch (e) {
    return json({ ok:false, error:'read_body_failed', detail: String(e?.message ?? e) }, 400);
  }

  let payload: any = {};
  try {
    payload = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    return json({ ok:false, error:'invalid_json' }, 400);
  }

  const email = String(payload.email ?? '').trim();
  const code  = String(payload.code ?? '').trim();

  if (!isValidEmail(email)) {
    return json({ ok:false, error:'invalid_email' }, 400);
  }
  if (!isValidCode(code)) {
    return json({ ok:false, error:'invalid_code' }, 400);
  }

  // === ここに既存の“本処理”を移植してください =========================
  // 例：
  //  1) pending テーブルに email / code の組があるか確認
  //  2) 既存ユーザーなら already_registered を返す
  //  3) 問題なければショートコード検証 → セッション発行 or 状態更新
  //
  // existingLogic(email, code) の戻り値は { ok:true, next:'ProfileRegister' } など
  // という想定にしておくとフロント連携が楽です。
  // ===================================================================

  try {
    // --- PLACEHOLDER: まずは疎通のみ（ここをあなたの実処理に差し替え） ---
    // もし DB に触るなら withTimeout で包む:
    // const res = await withTimeout(yourDbCall(), 8000);

    // ここで 200 を返してフロント/ネットワーク/設定が健全か先に確認
    return json({
      ok: true,
      next: 'ProfileRegister',
      diag: {
        emailRedact: redact(email),
        // 実運用では diag は false/環境変数で無効化推奨
      }
    }, 200);

  } catch (e) {
    // 例外はここで必ず JSON 返す（504 を防止）
    return json({
      ok:false,
      error:'unhandled_exception',
      detail: String((e as any)?.message ?? e),
      // スタックは長いので省略 or 部分表示
    }, 500);
  }
});
