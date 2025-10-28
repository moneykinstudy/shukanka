// app/supabase/functions/_shared/env.ts
export function getEnv() {
  const url  = Deno.env.get('PROJECT_URL') || '';
  const key  = Deno.env.get('SERVICE_ROLE_KEY') || '';
  const cors = Deno.env.get('CORS_ORIGIN') || '*';
  if (!url) throw new Error('PROJECT_URL not set');
  if (!key) throw new Error('SERVICE_ROLE_KEY not set');
  return { url, key, cors };
}
export function corsHeaders(origin: string): Record<string,string> {
  return {
    'access-control-allow-origin': String(origin || '*'),
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'content-type': 'application/json',
  };
}
