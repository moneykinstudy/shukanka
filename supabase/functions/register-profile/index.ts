import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "content-type": "application/json",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const projectUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SERVICE_ROLE_KEY") || "";
    if (!serviceRole) {
      return new Response(JSON.stringify({ error:"SERVICE_ROLE_KEY missing" }), { status:500, headers:CORS });
    }

    const admin = createClient(projectUrl, serviceRole);

    const body = await req.json().catch(() => ({}));
    const email   = String(body.email || "").trim().toLowerCase();
    const nickname = String(body.nickname || "").trim();
    const grade    = body.grade ?? null;
    const gender   = body.gender ?? null;
    const target_university = body.target_university ?? null;
    const target_faculty    = body.target_faculty ?? null;
    const full_name         = body.full_name ?? null;

    if (!email || !nickname) {
      return new Response(JSON.stringify({ error:"email and nickname required" }), { status:400, headers:CORS });
    }

    // 1) 既存ユーザー（auth）をメールで探す
    let userId: string | null = null;
    try {
      const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const hit = (listed?.users || []).find(u => String(u.email||"").toLowerCase() === email);
      if (hit) userId = hit.id;
    } catch(_){}

    // 2) いなければ作成（メール確認済みで作る）
    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true
      });
      if (error) {
        return new Response(JSON.stringify({ error: "auth createUser failed: " + error.message }), { status:500, headers:CORS });
      }
      userId = data.user?.id ?? null;
    }
    if (!userId) {
      return new Response(JSON.stringify({ error:"failed to ensure auth user" }), { status:500, headers:CORS });
    }

    // 3) profiles に userId を主キーとして upsert
    const { data: prof, error: upErr } = await admin
      .from("profiles")
      .upsert(
        { id: userId, email, nickname, grade, gender, target_university, target_faculty, full_name },
        { onConflict: "id" }
      )
      .select()
      .maybeSingle();

    if (upErr) {
      return new Response(JSON.stringify({ error: "profiles upsert failed: " + upErr.message }), { status:500, headers:CORS });
    }

    return new Response(JSON.stringify({ ok:true, profile: prof, created_user_id: userId }), { headers:CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status:500, headers:CORS });
  }
});
