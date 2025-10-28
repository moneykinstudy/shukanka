import { CommonActions } from '@react-navigation/native';
import { supabase } from './supabase';

/** サインアウト後に SignIn へ reset。無ければ Login→Auth→先頭の順でフォールバック */
export async function logoutToSignIn(navigation: any) {
  try {
    await supabase.auth.signOut();
    console.log('[logout] signed out');
  } catch (e) {
    console.error('[logout] signOut error:', e);
  }

  // ルートナビゲータ（タブ内からでも確実にリセット）
  const root = navigation?.getParent?.() ?? navigation;
  const names: string[] = root?.getState?.()?.routeNames || [];
  const target = ['SignIn', 'Login', 'Auth'].find(n => names.includes(n)) || names[0] || 'SignIn';

  console.log('[logout] routeNames:', names, '-> target:', target);
  root?.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: target as never }],
    })
  );
}
