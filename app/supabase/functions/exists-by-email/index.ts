import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  // ← Supabase SDK が付与する x-client-info を許可
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Vary": "Origin"
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  try {
    const url = new URL(req.url);

    let email = "";
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      email = String(body?.email ?? "").trim();
    } else {
      email = String(url.searchParams.get("email") ?? "").trim();
    }
    if (!email) {
      return new Response(JSON.stringify({ error: "email required" }), { status: 400, headers: { "content-type":"application/json", ...cors } });
    }

    const projectUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!serviceRole) {
      return new Response(JSON.stringify({ error: "SERVICE_ROLE_KEY missing" }), { status: 500, headers: { "content-type":"application/json", ...cors } });
    }

    const admin = createClient(projectUrl, serviceRole);
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .limit(1);

    if (error) {
      return new Response(JSON.stringify({ error: String(error.message || error) }), { status: 500, headers: { "content-type":"application/json", ...cors } });
    }

    const exists = (data?.length ?? 0) > 0;
    return new Response(JSON.stringify({ exists }), { headers: { "content-type":"application/json", ...cors } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "content-type":"application/json", ...cors } });
  }
});
