/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ORIGIN = Deno.env.get('CORS_ORIGIN') || '*';
const CORS = {
  'access-control-allow-origin': ORIGIN,
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'GET, OPTIONS',
  'content-type': 'application/json',
};
const ok  = (b: unknown, s=200) => new Response(JSON.stringify(b), { status: s, headers: CORS });
const bad = (b: unknown, s=400) => new Response(JSON.stringify(b), { status: s, headers: CORS });

export const handler = async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    const url = new URL(req.url);
    const email = (url.searchParams.get('email') || '').trim().toLowerCase();
    if (!email) return bad({ error: 'email required' }, 422);

    const supabaseUrl = Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !serviceKey) return bad({ error: 'Missing SUPABASE_URL / SERVICE_ROLE_KEY' }, 500);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // profiles にメールが存在するか（ilike: 大文字小文字無視）
    const { count, error } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .ilike('email', email);

    if (error) return bad({ error: error.message }, 500);

    return ok({ exists: (count || 0) > 0 });
  } catch (e: any) {
    return bad({ error: String(e?.message || e) }, 500);
  }
};

Deno.serve(handler);