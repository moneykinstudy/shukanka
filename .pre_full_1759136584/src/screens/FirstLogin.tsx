import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, ScrollView } from 'react-native';
import { ui } from './_ui';
import { supabase } from '../lib/supabase';

export default function FirstLogin({ navigation }: any){
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async ()=>{
    if (saving) return; setSaving(true);
    try{
      const { data:{ user } } = await supabase.auth.getUser();
      if(!user){ Alert.alert('未ログイン'); return; }
      const { error } = await supabase.from('profiles').upsert({ id: user.id, nickname }, { onConflict:'id' });
      if (error){ Alert.alert('保存エラー', error.message); return; }
      navigation.replace('Tabs');
    } finally { setSaving(false); }
  };

  return (
    <View style={ui.page}>
      <View style={ui.header}><Text style={ui.hTitle}>プロフィール登録</Text></View>
      <ScrollView style={ui.body}>
        <Text>ニックネーム</Text>
        <TextInput style={ui.input} value={nickname} onChangeText={setNickname} placeholder="太郎" />
        <View style={{height:12}}/>
        <Button title={saving?'保存中…':'登録する'} onPress={save} disabled={saving || !nickname}/>
      </ScrollView>
    </View>
  );
}
