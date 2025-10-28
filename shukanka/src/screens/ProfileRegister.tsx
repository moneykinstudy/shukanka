import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabase';

const URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://dmudbmvvsiofbupptnis.supabase.co') as string;
const KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'REPLACE_WITH_YOUR_ANON') as string;

// 送信を許可する選択肢（DB制約に合わせて必要なら調整）
const GRADE_OPTIONS = ['', '高1', '高2', '高3', '既卒'];
const GENDER_OPTIONS = ['', '男性', '女性', 'その他']; // 「未設定」を許さないバリデーションを下で実施

// 16バイト相当のHEXノンスを生成（crypto.getRandomValues が無い環境でもフォールバック）
function genNonce(lenBytes = 16): string {
  try {
    // @ts-ignore: React Native (with polyfill) でも使える場合あり
    const arr = new Uint8Array(lenBytes);
    // @ts-ignore
    if (globalThis.crypto?.getRandomValues) {
      // @ts-ignore
      globalThis.crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < lenBytes; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // 念のためのフォールバック
    let s = '';
    for (let i = 0; i < lenBytes; i++) s += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    return s;
  }
}

export default function ProfileRegister(){
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [fullName, setFullName]   = useState('');
  const [nickname, setNickname]   = useState('');
  const [grade, setGrade]         = useState<string>('');    // 未選択は空
  const [gender, setGender]       = useState<string>('');    // 未選択は空
  const [univ, setUniv]           = useState('');
  const [faculty, setFaculty]     = useState('');
  const [email, setEmail]         = useState(route?.params?.email ?? '');
  const [saving, setSaving]       = useState(false);

  useEffect(()=>{ console.log('[ProfileRegister] mounted'); },[]);

  const onSubmit = async ()=>{
    console.log('[ProfileRegister] onSubmit tapped');
    const em = String(email || '').trim().toLowerCase();
    if (!em || !nickname) { Alert.alert('入力エラー','メールとニックネームは必須です'); return; }
    if (!GRADE_OPTIONS.includes(grade) || grade==='') { Alert.alert('入力エラー','学年を選択してください'); return; }
    if (!GENDER_OPTIONS.includes(gender) || gender==='') { Alert.alert('入力エラー','性別を選択してください'); return; }

    try{
      setSaving(true);

      // ★ ここで nonce を生成して pending に保存する
      const nonce = genNonce();

      const payload: any = {
        email: em,                        // 小文字で統一
        nickname,
        grade,                            // DB CHECK ('高1','高2','高3','既卒') に一致
        gender,                           // DB CHECK ('男性','女性','その他') に一致
        target_university: univ || null,
        target_faculty: faculty || null,
        full_name: fullName || null,
        nonce,                            // ← 追加
      };

      // SDK 経由の upsert（onConflict=email）
      const { error } = await supabase
        .from('profiles_pending')
        .upsert(payload, { onConflict:'email' });

      console.log('[pending upsert SDK]', { error });

      // SDKが失敗したら REST フォールバック（Prefer: merge-duplicates）
      if (error) {
        const res = await fetch(`${URL}/rest/v1/profiles_pending?on_conflict=email`, {
          method:'POST',
          headers:{
            apikey: KEY,
            Authorization: `Bearer ${KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify(payload)
        });
        const text = await res.text();
        console.log('[pending upsert REST]', res.status, text);
        if (!(res.status===200 || res.status===201)) {
          Alert.alert('保存エラー', `status=${res.status}\n${text}`);
          return;
        }
      }

      // 成功したら Rank の説明へ（★ email と nonce を次画面に渡す）
      navigation.reset({
        index:0,
        routes:[{ name:'RankIntro', params:{ email: em, nonce } }]
      });
      console.log('[navigate -> RankIntro]', { email: em, nonce });

    }catch(e:any){
      console.error('[保存エラー]', e);
      Alert.alert('保存エラー', String(e?.message || e));
    }finally{
      setSaving(false);
    }
  };

  // テキスト入力の共通スタイル（グレー枠・白背景）
  const inputStyle = { backgroundColor:'#fff', borderColor:'#C9D4DF', borderWidth:1, borderRadius:12, padding:14 } as const;

  return (
    <View style={{ flex:1, backgroundColor:'#F3F7FB' }}>
      <View style={{ height:60, backgroundColor:'#2F80B9', alignItems:'center', justifyContent:'center' }}>
        <Text style={{ color:'#fff', fontSize:21, fontWeight:'900' }}>プロフィール登録</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding:20 }}>
        <Text style={{ fontWeight:'800', marginTop:12 }}>氏名</Text>
        <TextInput value={fullName} onChangeText={setFullName} style={inputStyle} />

        <Text style={{ fontWeight:'800', marginTop:16 }}>ニックネーム</Text>
        <TextInput value={nickname} onChangeText={setNickname} style={inputStyle} />

        <Text style={{ fontWeight:'800', marginTop:16 }}>学年</Text>
        <View style={{ borderWidth:0, backgroundColor:'transparent', borderRadius:12 }}>
          <Picker selectedValue={grade} onValueChange={setGrade} style={{ height:48 }}>
            {GRADE_OPTIONS.map((g)=> <Picker.Item key={g||'blank'} label={g} value={g} />)}
          </Picker>
        </View>

        <Text style={{ fontWeight:'800', marginTop:16 }}>性別</Text>
        <View style={{ borderWidth:0, backgroundColor:'transparent', borderRadius:12 }}>
          <Picker selectedValue={gender} onValueChange={setGender} style={{ height:48 }}>
            {GENDER_OPTIONS.map((g)=> <Picker.Item key={g||'blank'} label={g} value={g} />)}
          </Picker>
        </View>

        <Text style={{ fontWeight:'800', marginTop:16 }}>志望大学</Text>
        <TextInput value={univ} onChangeText={setUniv} style={inputStyle} />

        <Text style={{ fontWeight:'800', marginTop:16 }}>志望学部</Text>
        <TextInput value={faculty} onChangeText={setFaculty} style={inputStyle} />

        <Text style={{ fontWeight:'800', marginTop:16 }}>メールアドレス</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={inputStyle}
        />

        <View style={{ alignItems:'flex-end', marginTop:24 }}>
          <TouchableOpacity onPress={onSubmit}
            disabled={saving}
            style={{ backgroundColor: saving ? '#9fbfd9' : '#4DA3DD', paddingVertical:14, paddingHorizontal:24, borderRadius:12 }}>
            <Text style={{ color:'#fff', fontWeight:'900' }}>{saving ? '登録中…' : '登録する'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}