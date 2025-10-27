import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, Button, Alert, ScrollView } from 'react-native';
import { ui } from './_ui';
import { supabase } from '../lib/supabase';

/** Functions のベースURL（既存の方式を踏襲） */
function functionsBase(): string {
  try {
    const url =
      (globalThis as any)?.supabase?.url ||
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      '';
    const m = url.match(/^https:\/\/([a-z0-9]{20})\.supabase\.co/i);
    return m ? `https://${m[1]}.functions.supabase.co`
             : 'https://dmudbmvvsiofbupptnis.functions.supabase.co';
  } catch {
    return 'https://dmudbmvvsiofbupptnis.functions.supabase.co';
  }
}

export default function FirstLogin({ navigation }: any){
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);

  /** 多重タップ対策 */
  const reqIdRef = useRef(0);

  /** プロフィール保存 → 成功したら即 Tabs へ遷移（※オンボーディングは SignIn 側に移譲） */
  const save = useCallback(async ()=>{
    if (saving) return;
    const myReq = ++reqIdRef.current;
    setSaving(true);

    try{
      // 1) ログイン確認
      const { data:{ user }, error:authErr } = await supabase.auth.getUser();
      if (authErr) { Alert.alert('未ログイン', authErr.message); return; }
      if (!user)   { Alert.alert('未ログイン', '先にログインしてください。'); return; }

      // 2) auth と profiles の紐付け（Edge Function：存在しない/不一致時のみ修正）
      try {
        const { data: sess } = await supabase.auth.getSession();
        const jwt = sess?.session?.access_token;
        if (jwt) {
          const base = functionsBase();
          await fetch(`${base}/link-auth-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
            body: JSON.stringify({}),
          }).catch(()=>{ /* 失敗は致命ではないので無視 */ });
        }
      } catch { /* noop */ }

      // 3) profiles upsert
      const payload: any = { id: user.id, nickname };
      if (user.email) payload.email = String(user.email).toLowerCase();

      const { error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });

      if (error){
        Alert.alert('保存エラー', error.message);
        return;
      }

      // 4) そのまま Tabs へ（通知/A2HSの案内は SignIn.tsx 側で実施）
      if (myReq === reqIdRef.current) {
        navigation.replace('Tabs');
      }
    } catch (e:any) {
      Alert.alert('エラー', String(e?.message || e));
    } finally {
      if (myReq === reqIdRef.current) setSaving(false);
    }
  }, [saving, navigation, nickname]);

  return (
    <View style={ui.page}>
      <View style={ui.header}><Text style={ui.hTitle}>プロフィール登録</Text></View>
      <ScrollView style={ui.body}>
        <Text>ニックネーム</Text>
        <TextInput
          style={ui.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="太郎"
        />
        <View style={{height:12}}/>
        <Button title={saving?'保存中…':'登録する'} onPress={save} disabled={saving || !nickname}/>
      </ScrollView>
    </View>
  );
}
