import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, ScrollView } from 'react-native';
import { ui } from './_ui';
import { supabase } from '../lib/supabase';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';

export default function Login(){
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const redirectTo = AuthSession.makeRedirectUri({ useProxy: true });

  useEffect(()=>{
    console.log('Redirect URL (Expo Go):', redirectTo);
    const sub = Linking.addEventListener('url', async ({ url })=>{
      if (url.includes('access_token')) {
        const { data, error } = await supabase.auth.getSessionFromUrl({ url, storeSession: true });
        if (!error && data?.session) {
          const nav = require('../AppRoot').navRef;
          nav.current?.reset({ index:0, routes:[{ name:'Splash' as never }] });
        }
      }
    });
    return ()=>sub.remove();
  },[]);

  const sendMagicLink = async ()=>{
    if (sending) return;
    if (!/.+@.+/.test(email)) { Alert.alert('入力エラー','正しいメールを入力'); return; }
    setSending(true);
    try{
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: true }
      });
      if (error) { Alert.alert('送信エラー', error.message); return; }
      Alert.alert('送信しました','メールのリンクを開くか、6桁コードを入力してください。');
    } finally { setSending(false); }
  };

  const verifyCode = async ()=>{
    if (verifying) return;
    if (!/.+@.+/.test(email) || !/^[0-9]{6}$/.test(code)) {
      Alert.alert('入力エラー','メールと6桁コードを入力');
      return;
    }
    setVerifying(true);
    try{
      const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error) { Alert.alert('検証エラー', error.message); return; }
      if (data?.session){
        const nav = require('../AppRoot').navRef;
        nav.current?.reset({ index:0, routes:[{ name:'Splash' as never }] });
      }
    } finally { setVerifying(false); }
  };

  return (
    <View style={ui.page}>
      <View style={ui.header}><Text style={ui.hTitle}>ログイン</Text></View>
      <ScrollView style={ui.body} keyboardShouldPersistTaps="handled">
        <Text>メールアドレス</Text>
        <TextInput style={ui.input} value={email} onChangeText={setEmail}
          keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
        <View style={{height:12}}/>
        <Button title={sending?'送信中…':'ログインリンクを送る'} onPress={sendMagicLink} disabled={sending} />
        <View style={{height:20}}/>
        <Text>または 6桁コード</Text>
        <TextInput style={ui.input} value={code} onChangeText={setCode}
          keyboardType="number-pad" placeholder="123456" maxLength={6}/>
        <View style={{height:8}}/>
        <Button title={verifying?'確認中…':'6桁コードでログイン'} onPress={verifyCode} disabled={verifying}/>
      </ScrollView>
    </View>
  );
}
