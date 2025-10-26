import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Tabs from './tabs';
import Splash from '../screens/Splash';
import FirstLogin from '../screens/FirstLogin';
import Login from '../screens/Login';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';

const Stack = createNativeStackNavigator();
export const navRef: any = React.createRef();

export default function AppRoot(){
  useEffect(()=>{
    // 通知タップ → 提出タブ
    const sub1 = Notifications.addNotificationResponseReceivedListener(() => {
      if (navRef.current?.isReady()) {
        navRef.current.navigate('Tabs' as never);
        setTimeout(()=> navRef.current?.navigate('Submit' as never), 120);
      }
    });

    // ★ マジックリンク（studyrank://login-callback?...）を受け取ったらセッション確立
    const handleUrl = async (url:string)=>{
      try{
        const { data, error } = await supabase.auth.getSessionFromUrl({ url, storeSession: true });
        if (!error && data?.session) {
          // セッション確立：プロフィール有無で遷移は Splash に任せる
          navRef.current?.reset({ index:0, routes:[{ name:'Splash' as never }] });
        }
      }catch(e){ /* no-op */ }
    };

    // cold start: アプリがリンクで開かれた場合
    Linking.getInitialURL().then(u=>{ if(u) handleUrl(u); });
    // runtime: 既に開いている最中にリンクを踏んだ場合
    const sub2 = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return ()=>{ sub1.remove(); sub2.remove(); };
  },[]);

  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator screenOptions={{ headerShown:false }}>
        <Stack.Screen name="Splash" component={Splash} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="FirstLogin" component={FirstLogin} />
        <Stack.Screen name="Tabs" component={Tabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
