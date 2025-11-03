// Deno（Supabase Edge Functions）。未提出者に Expo Push を送る。
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Msg = { to: string; sound?: "default"; title: string; body: string };

Deno.serve(async (_req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // Service Role 必須
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const today = new Date().toISOString().slice(0,10);

  // 今日未提出のユーザー一覧（RPC）
  const { data: users, error: e1 } = await supabase
    .rpc("get_users_without_submission_for", { p_date: today });
  if (e1) return new Response(`RPC error: ${e1.message}`, { status: 500 });
  if (!users || users.length === 0) return new Response("no targets", { status: 200 });

  // Expo Push トークン取得
  const userIds = users.map((u: any) => u.id);
  const { data: tokens, error: e2 } = await supabase
    .from("push_tokens")
    .select("token")
    .in("user_id", userIds);
  if (e2) return new Response(`token error: ${e2.message}`, { status: 500 });

  const messages: Msg[] = (tokens ?? []).map((t) => ({
    to: t.token,
    sound: "default",
    title: "勉強記録の提出リマインダー",
    body: "まだ今日の提出が未完了のようです。忘れずに提出しましょう！"
  }));

  // Expo Push API へ送信（100件未満のチャンク）
  for (let i = 0; i < messages.length; i += 95) {
    const chunk = messages.slice(i, i + 95);
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chunk),
    });
  }

  return new Response(`sent: ${messages.length}`, { status: 200 });
});
