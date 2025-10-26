import { supabase } from './supabase';
import { CommonActions } from '@react-navigation/native';

export function attachAuthListener(navigation: any) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      const root = navigation?.getParent?.() ?? navigation;
      const names: string[] = root?.getState?.().routeNames || [];
      const target = names.includes('SignIn') ? 'SignIn' : (names[0] || 'SignIn');
      root?.dispatch(CommonActions.reset({ index:0, routes:[{ name: target as never }] }));
    }
  });
}
