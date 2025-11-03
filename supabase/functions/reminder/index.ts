// supabase/functions/reminder/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

const SLOTS = ["21:00", "22:00", "23:00"]; // 固定
const WINDOW_MIN = 2; // ±2分

webpush.setVapidDetails(
  "mailto:noreply@example.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
);

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function minutesOfDay(h: number, m: number) { return h * 60 + m; }

function isInWindowNow(tz: string) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const hh = Number(parts.find(p => p.type === "hour")?.value || "0");
  const mm = Number(parts.find(p => p.type === "minute")?.value || "0");
  const nowMin = minutesOfDay(hh, mm);

  for (let i = 0; i < SLOTS.length; i++) {
    const [sh, sm] = SLOTS[i].split(":").map(Number);
    const slotMin = minutesOfDay(sh, sm);
    if (Math.abs(nowMin - slotMin) <= WINDOW_MIN) return i;
  }
  return -1;
}

function ymdInTZ(tz: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date()).map(p => [p.type, p.value])
  );
  return {
    y: Number(parts.year),
    m: Number(parts.month),
    d: Number(parts.day),
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

serve(async () => {
  const { data: prefs, error: e1 } = await admin
    .from("reminder_prefs")
    .select("user_id, enabled, timezone")
    .eq("enabled", true);
  if (e1) { console.error(e1); return new Response("prefs error", { status: 500 }); }
  if (!prefs?.length) return new Response("no prefs", { status: 200 });

  let sent = 0;

  for (const pref of prefs) {
    const tz = pref.timezone || "Asia/Tokyo";
    const slotIndex = isInWindowNow(tz);
    if (slotIndex < 0) continue;

    const { y, m, d, dateStr } = ymdInTZ(tz);

    const { data: mark } = await admin
      .from("marks").select("user_id")
      .eq("user_id", pref.user_id).eq("y", y).eq("m", m).eq("d", d)
      .limit(1);
    if (mark && mark.length > 0) continue;

    const { data: already } = await admin
      .from("reminder_sends").select("user_id")
      .eq("user_id", pref.user_id).eq("date", dateStr).eq("slot", slotIndex)
      .limit(1);
    if (already && already.length > 0) continue;

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", pref.user_id);
    if (!subs?.length) continue;

    const payload = JSON.stringify({
      title: "今日は記録しましたか？",
      body: "○/×を1回つけると、今日の通知は止まります。",
      url: "/",
    });

    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any,
          payload,
        );
      } catch (e: any) {
        const code = e?.statusCode || e?.code;
        if (code === 404 || code === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        } else {
          console.error("push error", e);
        }
      }
    }

    await admin.from("reminder_sends").insert({
      user_id: pref.user_id, date: dateStr, slot: slotIndex,
    });

    sent++;
  }

  return new Response(`ok sent=${sent}`, { status: 200 });
});