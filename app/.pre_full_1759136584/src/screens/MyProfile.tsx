import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, ScrollView } from 'react-native';
import { ui } from './_ui';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';
import { calcStreak } from '../lib/streak';
import { Card } from '../components/Card';
import { SectionHeader } from '../components/SectionHeader';

export default function MyProfile(){
  const [email, setEmail] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [streak, setStreak] = useState<number>(0);

  useEffect(()=>{ (async()=>{
    const { data:{ user } } = await supabase.auth.getUser();
    if(!user) return;
    setEmail(user.email ?? '');

    // プロフィール取得
    const { data: prof } = await supabase.from('profiles').select('nickname').eq('id', user.id).maybeSingle();
    setNickname(prof?.nickname ?? '');

    // 直近30日の提出日を取得 → 連続日数へ
    const since = dayjs().subtract(29,'day').format('YYYY-MM-DD');
    const { data: logs } = await supabase
      .from('study_logs')
      .select('study_date')
      .eq('user_id', user.id)
      .gte('study_date', since)
      .order('study_date',{ ascending:false });
    const days = (logs ?? []).map(x=>x.study_date as string);
    setStreak(calcStreak(days));
  })(); },[]);

  const save = async ()=>{
    if (saving) return; setSaving(true);
    try{
      const { data:{ user } } = await supabase.auth.getUser();
      if(!user){ Alert.alert('未ログイン'); return; }
      const { error } = await supabase.from('profiles').upsert({ id:user.id, nickname }, { onConflict:'id' });
      if (error){ Alert.alert('保存エラー', error.message); return; }
      Alert.alert('保存しました');
    } finally { setSaving(false); }
  };

  return (
    <View style={ui.page}>
      <View style={ui.header}><Text style={ui.hTitle}>プロフィール</Text></View>
      <ScrollView style={ui.body} keyboardShouldPersistTaps="handled">
        <Card>
          <SectionHeader title="アカウント" />
          <Text style={{marginBottom:8}}>メール：{email || '（未設定）'}</Text>

          <SectionHeader title="ニックネーム" />
          <TextInput value={nickname} onChangeText={setNickname} style={[ui.input,{marginTop:6}]} placeholder="太郎" />
          <View style={{height:10}}/>
          <Button title={saving?'保存中…':'保存'} onPress={save} disabled={saving}/>
        </Card>

        <View style={{height:14}}/>
        <Card>
          <SectionHeader title="連続達成日数" />
          <Text style={{fontSize:24, fontWeight:'800'}}>{streak} 日</Text>
          <Text style={{opacity:0.6, marginTop:4}}>※直近30日から算出</Text>
        </Card>
      </ScrollView>
    </View>
  );
}
