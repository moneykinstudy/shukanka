// 最初のRank（UIは現状維持）— 昇格API成功後に SignIn へ（OTP送信は SignIn に一本化）
import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

// functions base を推定（既存 util があれば使う）
let _functionsBase: (() => string) | null = null;
try {
  // @ts-ignore
  const mod = require('../utils/functionsBase');
  if (mod && typeof mod.functionsBase === 'function') _functionsBase = mod.functionsBase;
} catch {}
function functionsBase(): string {
  if (_functionsBase) return _functionsBase();
  try {
    const url =
      (globalThis as any)?.supabase?.url ||
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      '';
    const m = url.match(/^https:\/\/([a-z0-9]{20})\.supabase\.co/i);
    // ★ 未設定なら送信停止（誤refへ飛ばさない）
    return m ? `https://${m[1]}.functions.supabase.co` : 'FALLBACK_REF';
  } catch {
    return 'FALLBACK_REF';
  }
}

type R = { params?: { email?: string; nonce?: string } };

export default function FirstRank() {
  const navigation = useNavigation<any>();
  const route = useRoute<R>();
  const email = String(route?.params?.email ?? '').trim().toLowerCase();
  const nonce = String(route?.params?.nonce ?? '').trim();

  // 「始める」押下時：Anon キーで Edge Function を直叩き（Service Role 側でRLS無視）
  const onStart = async () => {
    if (!email || !nonce) {
      Alert.alert('エラー', '必要な情報が不足しています。前の画面からやり直してください。');
      return;
    }

    try {
      const base = functionsBase();
      if (base === 'FALLBACK_REF') {
        Alert.alert('環境未設定', '.env.local の EXPO_PUBLIC_SUPABASE_URL / ANON を設定後、アプリを再起動してください。');
        return;
      }
      const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

      console.log('[FirstRank] call promote-pending-profile:', { base, email, nonceLen: nonce.length });

      const res = await fetch(`${base}/promote-pending-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(anon ? { apikey: anon, Authorization: `Bearer ${anon}` } : {}),
        },
        body: JSON.stringify({ email, nonce }),
      });

      const text = await res.text();
      console.log('[promote-pending-profile] HTTP', res.status, text);

      let payload: any = null;
      try { payload = JSON.parse(text); } catch { payload = { raw: text }; }

      const ok = res.ok && payload && payload.ok === true;
      if (!ok) {
        const step = payload?.step ? `\nstep: ${payload.step}` : '';
        const body = payload?.error || payload?.message || JSON.stringify(payload).slice(0, 400);
        Alert.alert('昇格に失敗しました', `HTTP ${res.status}${step}\n${body}`);
        return;
      }

      // ★ ここでは OTP を送らない（429予防）。SignIn に自動送信指示を渡す。
      Alert.alert('プロフィールを本登録しました', 'メールに届く6桁コードでログインを完了してください。');

      navigation.reset({
        index: 0,
        routes: [{
          name: 'SignIn',
          params: {
            email,
            awaitCode: true,
            autoSend: true,      // ← 初回だけ自動送信
            createUser: true,    // ← shouldCreateUser:true で送る
            info: '確認コードを送信します。届いたら6桁を入力してください。'
          }
        }]
      });

    } catch (e: any) {
      console.warn('[FirstRank] unexpected error:', e);
      Alert.alert('処理エラー', String(e?.message || e));
    }
  };

  return (
    <View style={{ flex:1, backgroundColor:'#F3F7FB' }}>
      {/* 上部帯 */}
      <View style={{ height:60, backgroundColor:'#2F80B9', alignItems:'center', justifyContent:'center' }}>
        <Text style={{ color:'#fff', fontSize:24, fontWeight:'900' }}>最初のRank</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom:24 }}>
        {/* 「あなたのRankは…」 */}
        <View style={{ paddingVertical:36, alignItems:'center', justifyContent:'center' }}>
          <Text style={{ fontSize:25, letterSpacing:2 }}>あなたのRankは…</Text>
        </View>

        {/* Rank：I の帯 */}
        <View style={{ backgroundColor:'#ECEFF3', paddingVertical:16, alignItems:'center', marginBottom:24 }}>
          <Text style={{ fontSize:30, fontWeight:'900', color:'#2F80B9' }}>Rank：I</Text>
        </View>

        {/* アイコン画像（I.png を実表示） */}
        <View style={{ alignItems:'center', justifyContent:'center', paddingVertical:12 }}>
          <View style={{
            width:220, height:220, borderRadius:28, borderWidth:2, borderColor:'#C9D4DF',
            backgroundColor:'#fff', alignItems:'center', justifyContent:'center', overflow:'hidden'
          }}>
            <Image
              source={require('../../assets/rank/I.png')}
              style={{ width:'100%', height:'100%', resizeMode:'cover' }}
            />
          </View>
        </View>

        {/* 下部の青帯説明文（中央揃え・大きめ白文字） */}
        <View style={{ backgroundColor:'#2F80B9', paddingVertical:32, paddingHorizontal:20, marginTop:36 }}>
          <Text style={{
            color:'#fff', fontSize:21, lineHeight:36, fontWeight:'900', textAlign:'center'
          }}>
            これから習慣化の完全定着を目指して{'\n'}
            毎日の勉強を記録として更新していく{'\n'}
            フレッシュさを持った初めての登録者
          </Text>
        </View>

        {/* 右下「始める」ボタン */}
        <View style={{ padding:20, alignItems:'flex-end' }}>
          <TouchableOpacity onPress={onStart}
            style={{ backgroundColor:'#4DA3DD', paddingVertical:14, paddingHorizontal:30, borderRadius:12 }}>
            <Text style={{ color:'#fff', fontWeight:'900', fontSize:18 }}>始める</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
