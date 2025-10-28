import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Alert, ScrollView } from 'react-native';
import dayjs from 'dayjs';
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';
import { ui } from './_ui';
import { supabase } from '../lib/supabase';
import { StudyLogSchema } from '../lib/validation';
import { HeaderBar } from '../components/HeaderBar';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';

const SUBJECTS = ['（未選択）','英語','数学','国語','理科','社会','情報','その他'] as const;
// 0〜500を5分刻み
const MINUTES: string[] = Array.from({ length: 101 }, (_, i) => String(i * 5));

type Row = { subject: typeof SUBJECTS[number]; minutes: string };

export default function SubmitToday(){
  const [rows, setRows] = useState<Row[]>([
    { subject:'（未選択）', minutes:'0' },
    { subject:'（未選択）', minutes:'0' },
    { subject:'（未選択）', minutes:'0' },
    { subject:'（未選択）', minutes:'0' },
  ]);
  const [memo, setMemo] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ (async()=>{
    const { data:{ user } } = await supabase.auth.getUser();
    if(!user) return;
    const today = dayjs().format('YYYY-MM-DD');
    const { data } = await supabase
      .from('study_logs')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('study_date', today)
      .limit(1);
    setSubmitted((data?.length ?? 0) > 0);
  })(); },[]);

  const setRow = (i:number, next:Partial<Row>)=>{
    setRows(prev=>{ const copy=[...prev]; copy[i] = { ...copy[i], ...next } as Row; return copy; });
  };

  const totalMinutes = useMemo(
    ()=> rows.reduce((sum,r)=> sum + (Number(r.minutes)||0), 0),
    [rows]
  );

  const save = async ()=>{
    if (saving || submitted) return;
    setSaving(true);
    try{
      const total = totalMinutes;
      const { data:{ user }, error:authErr } = await supabase.auth.getUser();
      if (authErr || !user) { Alert.alert('未ログイン','先にログインしてください'); return; }

      const parsed = StudyLogSchema.safeParse({ minutes: total, memo });
      if (!parsed.success) {
        const msg = parsed.error.issues[0]?.message ?? '入力に誤りがあります';
        Alert.alert('入力エラー', msg); return;
      }
      if (total <= 0){ Alert.alert('入力エラー','1分以上の学習時間を選択してください'); return; }

      const today = dayjs().format('YYYY-MM-DD');
      const detail = rows
        .filter(r=>Number(r.minutes)>0 && r.subject!=='（未選択）')
        .map(r=>`${r.subject}:${r.minutes}分`).join(' / ');
      const mergedMemo = detail ? (memo ? `${memo}\n\n内訳: ${detail}` : `内訳: ${detail}`) : memo;

      const { error } = await supabase.from('study_logs').upsert(
        { user_id: user.id, study_date: today, minutes: total, memo: mergedMemo },
        { onConflict: 'user_id,study_date' }
      );
      if (error){ Alert.alert('保存エラー', error.message); return; }

      try{ await Notifications.cancelAllScheduledNotificationsAsync(); }catch(_){}
      setSubmitted(true);
      Alert.alert('保存しました','本日のリマインダーを停止しました');
    } finally { setSaving(false); }
  };

  const box = { borderWidth:1, borderColor:'#C9D4DF', borderRadius:14, backgroundColor:'#fff', overflow:'hidden' };

  return (
    <View style={[ui.page,{backgroundColor:'#F3F7FB'}]}>
      <HeaderBar title="本日の勉強記録を提出" />
      <ScrollView style={[ui.body,{paddingTop:16}]} keyboardShouldPersistTaps="handled">
        <View style={{flexDirection:'row', justifyContent:'space-between', paddingHorizontal:4}}>
          <Text style={{fontWeight:'800', fontSize:16, color:'#2B2B2B'}}>勉強内容</Text>
          <Text style={{fontWeight:'800', fontSize:16, color:'#2B2B2B'}}>勉強時間（分）</Text>
        </View>

        {[0,1,2,3].map(i=>(
          <View key={i} style={{flexDirection:'row', gap:16, marginTop:12}}>
            <View style={[box, { flex:1 }]}>
              <Picker
                selectedValue={rows[i].subject}
                onValueChange={(v)=> setRow(i, { subject: v as Row['subject'] })}
              >
                {(['（未選択）','英語','数学','国語','理科','社会','情報','その他'] as const)
                  .map(s=><Picker.Item label={s} value={s} key={s}/>)}
              </Picker>
            </View>
            <View style={[box, { width:180 }]}>
              <Picker
                selectedValue={rows[i].minutes}
                onValueChange={(v)=> setRow(i, { minutes: String(v) })}
              >
                {MINUTES.map(m=><Picker.Item label={m} value={m} key={m}/>)}
              </Picker>
            </View>
          </View>
        ))}

        <View style={{height:22}}/>
        <Text style={{fontWeight:'800', fontSize:16, marginBottom:8, color:'#2B2B2B'}}>頑張ったことメモ</Text>
        <TextInput
          style={[ui.input,{height:160, borderRadius:16, borderColor:'#C9D4DF'}]}
          value={memo}
          onChangeText={setMemo}
          placeholder="今日の振り返りなどを自由に"
          multiline
        />

        <View style={{height:28}}/>
        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
          <SecondaryButton
            title="ログアウト"
            onPress={async()=>{
              await supabase.auth.signOut();
              alert('サインアウトしました');
              const nav=require('../AppRoot').navRef;
              nav.current?.reset({index:0,routes:[{name:'Login' as never}]});
            }}
          />
          <PrimaryButton
            title={ submitted ? '今日は提出済み' : (saving ? '保存中…' : '提出する') }
            onPress={save}
            disabled={saving || submitted}
          />
        </View>

        <View style={{height:16}}/>
        <Text style={{opacity:0.65, fontSize:12}}>合計：{totalMinutes} 分</Text>
        <View style={{height:28}}/>
      </ScrollView>
    </View>
  );
}
