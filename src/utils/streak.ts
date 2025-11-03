// utils/streak.ts
import { functionsBase } from './functionsBase';

export type StreakSummary = {
  streak: number;   // 連続達成日数
  sum7: number;     // 直近7日の合計分
};

export async function fetchUserStreakSummary(userId: string, grade?: string): Promise<StreakSummary> {
  const base = functionsBase();
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

  const url = `${base}/get-streak?user_id=${encodeURIComponent(userId)}${grade ? `&grade=${encodeURIComponent(String(grade))}` : ''}`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(anon ? { apikey: anon, Authorization: `Bearer ${anon}` } : {}),
    },
  });
  const txt = await res.text();
  if (!res.ok) {
    // ログだけ吐いて、呼び出し側のUIは崩さない
    console.warn('[get-streak] HTTP', res.status, txt?.slice(0,200));
    return { streak: 0, sum7: 0 };
  }
  let j: any;
  try { j = JSON.parse(txt); } catch { return { streak: 0, sum7: 0 }; }
  return {
    streak: Number(j?.streak ?? 0) || 0,
    sum7: Number(j?.sum7 ?? 0) || 0,
  };
}