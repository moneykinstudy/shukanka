import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { ui } from './_ui';
import { getSessionUser, hasProfile } from '../lib/auth';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';

export default function Splash({ navigation }: any){
  useEffect(()=>{ (async()=>{
    const initial = await Linking.getInitialURL();
    if (initial?.includes('access_token')) {
      try { await supabase.auth.getSessionFromUrl({ storeSession: true }); } catch {}
    }
    const user = await getSessionUser();
    if(!user){ navigation.replace('Login'); return; }
    const ok = await hasProfile(user.id);
    navigation.replace(ok ? 'Tabs' : 'FirstLogin');
  })(); },[navigation]);

  return (
    <View style={[ui.page,{alignItems:'center',justifyContent:'center'}]}>
      <ActivityIndicator size="large" color="#1891c5" />
      <Text style={{marginTop:12}}>起動中…</Text>
    </View>
  );
}
