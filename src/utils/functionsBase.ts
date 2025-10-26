// app/src/utils/functionsBase.ts
export function functionsBase(): string {
  try {
    const url =
      (globalThis as any)?.supabase?.url ||
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      '';
    const m = url.match(/^https:\/\/([a-z0-9]{20})\.supabase\.co/i);
    // ★ 未設定で他プロジェクトに飛ばさない
    return m ? `https://${m[1]}.functions.supabase.co` : 'FALLBACK_REF';
  } catch {
    return 'FALLBACK_REF';
  }
}