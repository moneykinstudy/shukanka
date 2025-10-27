// supabase/functions/promote-pending-profile/index.ts
// Deno Deploy Runtime (Edge Functions)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.4";

type PendingRow = {
  email: string;
  full_name: string | null;
  nickname: string | null;
  grade: "高1" | "高2" | "高3" | "既卒" | null;
  gender: "男性" | "女性" | "その他" | null;
  target_university: string | null;
  target_faculty: string | null;
  // ほか pending 側に存在しうる列
  icon_url?: string | null;
  avatar_url?: string | null;
  // 制御用
  nonce?: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!url || !serviceKey) {
      return json({ error: "service env missing" }, 500);
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const emailRaw: string = String(body?.email || "").trim().toLowerCase();
    const nonce: string = String(body?.nonce || "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return json({ error: "invalid_email", step: "validate" }, 400);
    }
    if (!nonce || nonce.length < 16) {
      return json({ error: "invalid_nonce", step: "validate" }, 400);
    }

    // 1) pending を引く（nonce を含めて厳密一致）
    const { data: pending, error: selErr } = await admin
      .from("profiles_pending")
      .select("*")
      .eq("email", emailRaw)
      .eq("nonce", nonce)
      .maybeSingle();

    if (selErr) return json({ error: selErr.message, step: "pending_select" }, 500);
    if (!pending) return json({ error: "invalid_email_or_nonce", step: "pending_select" }, 404);

    const p = pending as PendingRow;

    // 2) profiles に upsert（on_conflict = email）
    const upsertRow = {
      email: emailRaw,                       // 一意キー（on_conflict）
      contact_email: emailRaw,               // UI 側で参照しているなら合わせる
      full_name: p.full_name ?? null,
      nickname: p.nickname ?? null,
      grade: p.grade ?? null,
      gender: p.gender ?? null,
      target_university: p.target_university ?? null,
      target_faculty: p.target_faculty ?? null,
      icon_url: p.icon_url ?? null,
      avatar_url: p.avatar_url ?? null,
      current_rank: "I",                     // 初期ランク
      rank_about_ack: false,                 // 既定値
      rank_initialized: true,                // 初期化完了
      streak_days: 0,                        // 既定値
      updated_at: new Date().toISOString(),  // 追記
    };

    const { data: up, error: upErr } = await admin
      .from("profiles")
      .upsert(upsertRow, { onConflict: "email" })
      .select("id, email, full_name, nickname, grade, gender, target_university, target_faculty, auth_user_id")
      .maybeSingle();

    if (upErr) return json({ error: upErr.message, step: "profiles_upsert" }, 500);

    // 3) pending は任意で削除（または nonce を消す）
    await admin.from("profiles_pending").delete().eq("email", emailRaw).eq("nonce", nonce);

    return json({ ok: true, profile: up }, 200);
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