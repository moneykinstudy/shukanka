import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { ui } from './_ui';
import { supabase } from '../lib/supabase';
import { ProfileSchema } from '../lib/profile-validation';

const GRADES = ['中1','中2','中3','高1','高2','高3','既卒'] as const;

export default function EditProfile({ navigation }: any){
  const [nickname, setNickname] = useState('');
  const [grade, setGrade] = useState<typeof GRADES[number]>('高1');
  const [goal, setGoal] = useState('300');
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ (async()=>{
    const { data:{ user } } = await supabase.auth.getUser();
    if(!user) return;
    const { data } = await supabase.from('profiles').select('nickname, grade, week_goal_minutes').eq('id', user.id).maybeSingle();
    if (data?.nickname) setNickname(data.nickname);
    if (data?.grade && (GRADES as readonly string[]).includes(data.grade)) setGrade(data.grade as any);
    if (data?.week_goal_minutes) setGoal(String(data.week_goal_minutes));
  })(); },[]);

  const save = async ()=>{
    if (saving) return;
    setSaving(true);
    try{
      const parsed = ProfileSchema.safeParse({ nickname, grade, gender:'unknown' });
      if (!parsed.success){ Alert.alert('入力エラー', parsed.error.issues[0]?.message ?? '入力を確認してください'); return; }
      const g = Math.max(0, Number(goal) || 0);
      const { data:{ user }, error: authErr } = await supabase.auth.getUser();
      if(authErr || !user){ Alert.alert('未ログイン'); return; }
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, nickname, grade, week_goal_minutes: g }, { onConflict: 'id' });
      if(error){ Alert.alert('保存エラー', error.message); return; }
      Alert.alert('保存しました'); navigation.goBack();
    } finally { setSaving(false); }
  };

  return (
    <View style={ui.page}>
      <View style={ui.header}><Text style={ui.hTitle}>プロフィール編集</Text></View>
      <ScrollView style={ui.body} keyboardShouldPersistTaps="handled">
        <Text>ニックネーム</Text>
        <TextInput style={ui.input} value={nickname} onChangeText={setNickname} placeholder="例: 太郎" />

        <View style={{height:12}}/>
        <Text>学年</Text>
        <View style={{flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:6}}>
          {GRADES.map(g=>(
            <TouchableOpacity key={g} onPress={()=>setGrade(g)} style={{
              paddingHorizontal:12, paddingVertical:8, borderRadius:999,
              backgroundColor: grade===g ? '#1891c5' : '#eef2f6'
            }}>
              <Text style={{color: grade===g ? '#fff' : '#111'}}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{height:12}}/>
        <Text>週目標（分）</Text>
        <TextInput style={ui.input} keyboardType="number-pad" value={goal} onChangeText={setGoal} placeholder="例: 300" />

        <View style={{height:16}}/>
        <Button title={saving ? '保存中…' : '保存'} onPress={save} disabled={saving} />
      </ScrollView>
    </View>
  );
}
