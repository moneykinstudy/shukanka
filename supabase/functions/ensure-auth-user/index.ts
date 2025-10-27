/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getEnv, corsHeaders } from '../_shared/env.ts'

type JSONLike = Record<string, unknown> | Array<unknown> | string | number | boolean | null
const ok  = (cors: string, b: JSONLike, s=200) => new Response(JSON.stringify(b), { status: s, headers: corsHeaders(cors) })
const bad = (cors: string, b: JSONLike, s=400) => new Response(JSON.stringify(b), { status: s, headers: corsHeaders(cors) })

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

export const handler = async (req: Request) => {
  const { url, key, cors } = getEnv();
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(cors) })
  if (req.method !== 'POST')   return bad(cors, { error: 'POST only' }, 405)

  // body
  let email = ''
  try {
    const body = await req.json().catch(() => ({} as any))
    email = String(body?.email || '').trim().toLowerCase()
  } catch {
    return bad(cors, { error: 'invalid json' }, 400)
  }
  if (!email || !isEmail(email)) return bad(cors, { ok:false, error: 'invalid email' }, 400)

  const admin = createClient(url, key, { auth: { persistSession: false } })

  // profiles に居るか
  const { data: prof, error: profErr } = await admin
    .from('profiles')
    .select('id')
    .or(`contact_email.ilike.${email},email.ilike.${email}`)
    .limit(1)

  if (profErr) return bad(cors, { error: 'profiles query failed', detail: String(profErr.message || profErr) }, 500)
  if (!prof || prof.length === 0) return ok(cors, { ok:false, reason:'not_in_profiles' }, 200)

  return ok(cors, { ok:true, reason:'in_profiles' }, 200)
};

Deno.serve(handler);
