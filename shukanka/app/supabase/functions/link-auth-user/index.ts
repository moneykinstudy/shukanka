// supabase/functions/link-auth-user/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!url || !serviceKey) return json({ error: "service env missing" }, 500);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // 認証済みユーザー（JWT）を取得
    const authHeader = req.headers.get("authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!accessToken) return json({ error: "no jwt" }, 401);

    const { data: userInfo, error: userErr } = await admin.auth.getUser(accessToken);
    if (userErr || !userInfo?.user) return json({ error: userErr?.message || "invalid jwt" }, 401);

    const uid = userInfo.user.id;
    const email = (userInfo.user.email || "").toLowerCase();

    // profiles の auth_user_id が空のものを紐付け
    const { error: upErr } = await admin
      .from("profiles")
      .update({ auth_user_id: uid, updated_at: new Date().toISOString() })
      .eq("email", email)
      .is("auth_user_id", null);

    if (upErr) return json({ error: upErr.message, step: "profiles_link" }, 500);

    return json({ ok: true, user_id: uid, email }, 200);
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
