import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, TextInput, Alert, ScrollView } from 'react-native';
import dayjs from 'dayjs';
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';
import { ui } from './_ui';
import { supabase } from '../lib/supabase';
import { logoutToSignIn } from '../lib/logout';
import { StudyLogSchema } from '../lib/validation';
import { HeaderBar } from '../components/HeaderBar';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';
import { appEvents, AppEvent } from '../lib/appEvents'; // ★既存

const SUBJECTS = ['（未選択）','英語','数学','国語','理科','社会','情報','その他'] as const;
const MINUTES: string[] = Array.from({ length: 101 }, (_, i) => String(i * 5));

type Row = { subject: typeof SUBJECTS[number]; minutes: string };

const labelText = { fontWeight: '800' as const, fontSize: 16, color: '#2B2B2B' };
const selectWrap = { height: 56, justifyContent: 'center' as const };

/** ★追加：profiles.id を堅牢に解決する共通関数 */
async function resolveProfileId(): Promise<string | null> {
  const { data: s } = await supabase.auth.getSession();
  const uid = s?.session?.user?.id || null;
  const jwt = s?.session?.access_token || null;
  if (!uid) return null;

  // 1) 新方式: auth_user_id = uid
  const q1 = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', uid)
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (q1.data?.id) return q1.data.id;

  // 2) 旧方式救済: id = uid
  const q2 = await supabase
    .from('profiles')
    .select('id')
    .eq('id', uid)
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (q2.data?.id) return q2.data.id;

  // 3) まだ無ければ Edge で紐付けを試みる → 再取得
  if (jwt) {
    try {
      const base = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
      await fetch(base + '/functions/v1/link-auth-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt },
      }).catch(() => {});
    } catch {}
    const q3 = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', uid)
      .limit(1)
      .maybeSingle<{ id: string }>();
    if (q3.data?.id) return q3.data.id;
  }

  return null;
}

export default function SubmitToday(){
  const navigation = useNavigation<any>();

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
    try{
      const { data:{ user } } = await supabase.auth.getUser();
      if(!user) return;

      // ★ profiles.id を取得して、そのIDで提出済み判定を行う（より堅牢に）
      const profileId = await resolveProfileId();
      const today = dayjs().format('YYYY-MM-DD');
      if (!profileId) { setSubmitted(false); return; }

      const { data, error } = await supabase
        .from('study_logs')
        .select('id')
        .eq('user_id', profileId) // ← profiles.id
        .eq('study_date', today)
        .limit(1);
      if (error) console.warn('[SubmitToday] submitted-check error:', error);
      setSubmitted((data?.length ?? 0) > 0);
    }catch(e){ console.warn('[SubmitToday] submitted-check exception:', e); }
  })(); },[]);

  const setRow = (i:number, next:Partial<Row>)=>{
    setRows(prev => {
      const copy = [...prev];
      copy[i] = { ...copy[i], ...next } as Row;
      return copy;
    });
  };

  const totalMinutes = useMemo(
    ()=> rows.reduce((sum,r)=> sum + (Number(r.minutes)||0), 0),
    [rows]
  );

  const chosenSubject = useMemo(() => {
    const pick = rows.find(r => Number(r.minutes) > 0 && r.subject !== '（未選択）');
    return pick ? pick.subject : '合計';
  }, [rows]);

  const save = useCallback(async ()=>{
    if (saving || submitted) return;
    setSaving(true);
    try{
      const total = totalMinutes;

      const { data:{ user }, error:authErr } = await supabase.auth.getUser();
      if (authErr || !user) { Alert.alert('未ログイン','先にログインしてください'); return; }

      // ★ ここで profiles.id をより堅牢に解決（FK対策）
      const profileId = await resolveProfileId();
      if (!profileId) {
        Alert.alert('保存エラー','プロフィールの紐付けが見つかりません（profiles に現在のユーザーの行が必要です）');
        return;
      }

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

      const payload = {
        user_id: profileId,        // ← ★ auth.id ではなく profiles.id を入れる
        study_date: today,
        log_day: today,
        subject: chosenSubject,
        minutes: total,
        memo: mergedMemo,
      };

      const { error } = await supabase
        .from('study_logs')
        .upsert(payload, { onConflict: 'user_id,study_date', ignoreDuplicates: false });

      if (error) {
        console.error('[SubmitToday] upsert error:', error);
        const code = (error as any)?.code;
        if (code === '23503') {
          Alert.alert('保存エラー','ユーザープロフィールが未作成の可能性があります（profiles に現在のユーザーIDの行が必要です）。');
          return;
        }
        if (code === '23505') {
          setSubmitted(true);
          Alert.alert('今日は提出済みです');
          return;
        }
        Alert.alert('保存エラー', error.message || String(error));
        return;
      }

      try{ await Notifications.cancelAllScheduledNotificationsAsync(); }catch(_){}
      setSubmitted(true);
      Alert.alert('保存しました','本日のリマインダーを停止しました');

      // ★ 提出完了イベントを発火（MyProfile / MyWeek / Rivals が購読していれば即反映）
      appEvents.emit(AppEvent.StudySubmitted);

    } finally { setSaving(false); }
  }, [saving, submitted, totalMinutes, rows, memo, chosenSubject]);

  return (
    <View style={[ui.page,{backgroundColor:'#F3F7FB'}]}>
      <HeaderBar title="本日の勉強記録を提出" />
      <ScrollView style={[ui.body,{paddingTop:16}]} keyboardShouldPersistTaps="handled">
        {/* 見出し行 */}
        <View style={{flexDirection:'row', justifyContent:'space-between', paddingHorizontal:4}}>
          <Text style={labelText}>勉強内容</Text>
          <Text style={labelText}>勉強時間（分）</Text>
        </View>

        {/* 4行分のプルダウン */}
        {[0,1,2,3].map(i=>(
          <View key={i} style={{flexDirection:'row', gap:16, marginTop:14}}>
            {/* 勉強内容 */}
            <View style={[selectWrap, { flex:1 }]}>
              <Picker
                style={{ height: 52, backgroundColor:'transparent' }}
                selectedValue={rows[i].subject}
                onValueChange={(v)=> setRow(i, { subject: v as Row['subject'] })}
              >
                {SUBJECTS.map(s => <Picker.Item label={s} value={s} key={s}/>)}
              </Picker>
            </View>

            {/* 勉強時間 */}
            <View style={[selectWrap, { width:180 }]}>
              <Picker
                style={{ height: 52, backgroundColor:'transparent' }}
                selectedValue={rows[i].minutes}
                onValueChange={(v)=> setRow(i, { minutes: String(v) })}
              >
                {MINUTES.map(m => <Picker.Item label={m} value={m} key={m}/>)}
              </Picker>
            </View>
          </View>
        ))}

        {/* メモ欄 */}
        <View style={{height:24}}/>
        <Text style={[labelText, { marginBottom:8 }]}>頑張ったことメモ</Text>
        <TextInput
          style={{
            backgroundColor:'#fff',
            borderColor:'#D3D9E2',
            borderWidth:2,
            borderRadius:18,
            padding:14,
            minHeight:160,
            textAlignVertical:'top',
          }}
          value={memo}
          onChangeText={setMemo}
          placeholder="今日の振り返りを書きましょう"
          placeholderTextColor="#9AA4B2"
          multiline
        />

        <View style={{height:28}}/>
        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
          <SecondaryButton
            title="ログアウト"
            onPress={async()=>{
              await logoutToSignIn(navigation);
              const nav = require('../AppRoot').navRef;
              nav.current?.reset({ index:0, routes:[{ name:'Login' as never }] });
            }}
          />
          <PrimaryButton
            title={ saving ? '保存中…' : (submitted ? '今日は提出済み' : '提出する') }
            onPress={save}
            disabled={saving || submitted}
          />
        </View>

        <View style={{height:28}}/>
      </ScrollView>
    </View>
  );
}
