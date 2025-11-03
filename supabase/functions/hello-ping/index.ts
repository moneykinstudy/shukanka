const ALLOW_ORIGIN = 'http://localhost:8081';
Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': ALLOW_ORIGIN,
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
      status: 204,
    });
  }
  return new Response(JSON.stringify({ ok: true, pong: true, ts: Date.now() }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    },
    status: 200,
  });
});
