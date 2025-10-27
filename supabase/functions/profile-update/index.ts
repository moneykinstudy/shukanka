import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
    }
    const body = await req.json().catch(() => ({}));
    const user_id = String(body.user_id || "").trim();
    if (!user_id) return new Response(JSON.stringify({ error: "user_id required" }), { status: 400 });

    const patch: Record<string, any> = {};
    const allow = ["email","nickname","grade","gender","target_university","target_faculty","full_name"];
    for (const k of allow) if (k in body) patch[k] = body[k];

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service);

    const { error } = await admin.from("profiles").update(patch).eq("id", user_id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
