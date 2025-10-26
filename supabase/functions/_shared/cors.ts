// supabase/functions/_shared/cors.ts
export function corsHeaders(origin: string | null) {
  // 開発中は * でOK。必要なら環境変数で絞る
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export function withCORS(handler: (req: Request) => Promise<Response> | Response) {
  return async (req: Request) => {
    const origin = req.headers.get('origin');
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders(origin) });
    }
    try {
      const res = await handler(req);
      const headers = new Headers(res.headers);
      const ch = corsHeaders(origin);
      Object.entries(ch).forEach(([k, v]) => headers.set(k, v));
      return new Response(res.body, { status: res.status, headers });
    } catch (e: any) {
      // 例外で落ちてもCORSが付くようにする
      return new Response(JSON.stringify({ error: String(e?.message || e), step: 'wrapper' }), {
        status: 500,
        headers: corsHeaders(origin),
      });
    }
  };
}
