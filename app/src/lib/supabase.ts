// app/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!URL || !KEY) {
  // 実行時に気づけるようログに出す（本番は消してOK）
  // @ts-ignore
  console.error('[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY');
  // ここで throw せず、使う側に FALLBACK_REF ガードをさせてもOK
}

export const supabase = createClient(URL, KEY);