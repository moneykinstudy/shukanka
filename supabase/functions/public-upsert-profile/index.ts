import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
  "content-type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: CORS });
    }

    const body = await req.json().catch(() => ({}));
    const {
      email,
      nickname,
      grade,
      gender,
      target_university = null,
      target_faculty = null,
      full_name = null,
    } = body || {};

    if (!email || !nickname || !grade || !gender) {
      return new Response(JSON.stringify({ error: "missing required fields" }), { status: 400, headers: CORS });
    }

    const projectUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SERVICE_ROLE_KEY") || "";
    if (!serviceRole) {
      return new Response(JSON.stringify({ error: "SERVICE_ROLE_KEY missing" }), { status: 500, headers: CORS });
    }
    const admin = createClient(projectUrl, serviceRole);

    // 既存 profiles を email で探索
    const { data: found, error: selErr } = await admin
      .from("profiles")
      .select("id")
      .eq("email", String(email))
      .limit(1);

    if (selErr) {
      return new Response(JSON.stringify({ error: "select profiles failed", detail: selErr.message }), { status: 500, headers: CORS });
    }

    const payload: any = {
      email: String(email),
      nickname: String(nickname),
      grade: String(grade),
      gender: String(gender),
      target_university,
      target_faculty,
      full_name,
    };

    if (found && found.length > 0) {
      // 既存レコードに対する UPDATE（外部キーに触れないので安全）
      const { error: updErr } = await admin
        .from("profiles")
        .update(payload)
        .eq("email", String(email));
      if (updErr) {
        return new Response(JSON.stringify({ error: "update profiles failed", detail: updErr.message }), { status: 500, headers: CORS });
      }
      return new Response(JSON.stringify({ ok: true, mode: "updated_profiles" }), { headers: CORS });
    }

    // 既存が無い → 未ログイン登録は外部キー制約回避のため pending に保存
    const { error: insErr } = await admin
      .from("profiles_pending")
      .upsert(payload, { onConflict: "email" });

    if (insErr) {
      return new Response(JSON.stringify({ error: "upsert profiles_pending failed", detail: insErr.message }), { status: 500, headers: CORS });
    }

    return new Response(JSON.stringify({ ok: true, mode: "saved_pending" }), { headers: CORS });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: CORS });
  }
});
