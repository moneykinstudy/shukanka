import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 既存 util がある場合はそちらを使ってOK
let _functionsBase: (() => string) | null = null;
try {
  // @ts-ignore
  const mod = require('../utils/functionsBase');
  if (mod && typeof mod.functionsBase === 'function') {
    _functionsBase = mod.functionsBase;
  }
} catch {}
function functionsBase(): string {
  if (_functionsBase) return _functionsBase();
  try {
    const url =
      (globalThis as any)?.supabase?.url ||
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      '';
    const m = url.match(/^https:\/\/([a-z0-9]{20})\.supabase\.co/i);
    return m ? `https://${m[1]}.functions.supabase.co` : 'FALLBACK_REF';
  } catch {
    return 'FALLBACK_REF';
  }
}

const isValidEmail = (em: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);

// ===== 固定値：429 受信時は最低でも 60 秒クールダウン =====
const COOLDOWN_MS = 60_000;
const cdKey = (em: string) => `otp_cooldown_${em.toLowerCase()}`;

// ★ Rivals の OnboardOverlay が監視しているトリガキー
const TRIGGER_AFTER_LOGIN = 'onboard:trigger_after_login';

type RouteParams = {
  email?: string;
  awaitCode?: boolean;
  autoSend?: boolean;
  createUser?: boolean; // 新規ユーザーなら true
  info?: string;
};

export default function SignIn() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const p: RouteParams = route?.params || {};

  // ---- state ----
  const [email, setEmail] = useState(p.email ?? '');
  const [sending, setSending] = useState(false);
  const [awaitCode, setAwaitCode] = useState<boolean>(!!p.awaitCode);
  const [info, setInfo] = useState<string | null>(p.info ?? null);
  const [code, setCode] = useState('');

  // ===== クールダウン =====
  const [nextSendAt, setNextSendAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id); }, []);
  useEffect(() => {
    (async () => {
      const em = (email || '').trim().toLowerCase();
      if (!em) { setNextSendAt(null); return; }
      try {
        const raw = await AsyncStorage.getItem(cdKey(em));
        const ts = raw ? Number(raw) : NaN;
        if (isFinite(ts) && ts > Date.now()) setNextSendAt(ts);
        else setNextSendAt(null);
      } catch { setNextSendAt(null); }
    })();
  }, [email]);

  const remainSec = useMemo(() => {
    if (!nextSendAt) return 0;
    const diff = Math.max(0, nextSendAt - now);
    return Math.ceil(diff / 1000);
  }, [nextSendAt, now]);
  const inCooldown = remainSec > 0;
  const startCooldown = async (em: string, ms = COOLDOWN_MS) => {
    const ts = Date.now() + ms;
    setNextSendAt(ts);
    try { await AsyncStorage.setItem(cdKey(em), String(ts)); } catch {}
  };

  // ---- 新規登録導線 ----
  const goRegister = () => {
    const em = String(email || '').trim();
    if (!em) {
      Alert.alert('入力エラー', 'まずメールアドレスを入力してください');
      return;
    }
    navigation.navigate('ProfileRegister', { email: em });
  };

  /**
   * OTP 送信：既存向け（shouldCreateUser:false）、新規向け（true）の両対応
   */
  const sendOtp = async (em: string, createUser: boolean) => {
    if (inCooldown) {
      setInfo(`短時間に連続して送信できません。${remainSec}秒後にお試しください。`);
      return;
    }

    const base = functionsBase();
    const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
    if (base === 'FALLBACK_REF') {
      Alert.alert('環境未設定', 'EXPO_PUBLIC_SUPABASE_URL/ANON_KEY を .env に設定して再起動してください。');
      return;
    }

    if (!createUser) {
      const r = await fetch(`${base}/ensure-auth-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(anon ? { apikey: anon, Authorization: `Bearer ${anon}` } : {}),
        },
        body: JSON.stringify({ email: em }),
      });
      const txt = await r.text();
      if (!r.ok) {
        if (r.status === 429) {
          await startCooldown(em, COOLDOWN_MS);
          throw new Error(`送信が多すぎます。${Math.ceil(COOLDOWN_MS/1000)}秒後に再度お試しください。`);
        }
        throw new Error(`メール確認に失敗しました (HTTP ${r.status})\n${txt?.slice(0,200) || ''}`);
      } else {
        try {
          const j = JSON.parse(txt);
          if (j?.ok === false && j?.reason === 'not_in_profiles') {
            setAwaitCode(false);
            setInfo('このメールアドレスのプロフィールが見つかりません。新規登録からプロフィール情報をご登録ください。');
            return;
          }
        } catch {}
      }
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: em,
      options: {
        shouldCreateUser: !!createUser,
        emailRedirectTo:
          (process.env.EXPO_PUBLIC_SITE_URL
            ? `${process.env.EXPO_PUBLIC_SITE_URL}/auth/callback`
            : (typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : undefined)),
      },
    });

    if (error) {
      const status = (error as any)?.status;
      if (status === 429) {
        await startCooldown(em, COOLDOWN_MS);
        setInfo('短時間に連続して送信できません。1分ほど間を空けて再度お試しください。');
        return;
      }
      if (status === 422) {
        throw new Error([
          'ログインリンク/コードの送信に失敗しました（422）。考えられる原因：',
          '・Email Provider が無効／サインアップ禁止の設定',
          '・Redirect URL が未登録/不一致',
          '・60秒以内の連続送信（時間を置いて再試行）',
          '',
          `詳細: ${error.message || String(error)}`
        ].join('\n'));
      }
      throw error;
    }
  };

  // ---- 「ログイン」ボタン（既存向け） ----
  const tryLogin = async () => {
    const emRaw = String(email || '').trim();
    const em = emRaw.toLowerCase();

    if (!isValidEmail(emRaw)) {
      setAwaitCode(false);
      setInfo('正しいメールアドレスを記入してください。');
      return;
    }
    if (inCooldown) {
      setInfo(`短時間に連続して送信できません。${remainSec}秒後にお試しください。`);
      return;
    }

    setSending(true);
    try {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      await sendOtp(em, false); // 既存は createUser=false
      setAwaitCode(true);
      setInfo('6桁コードをメールで送信しました。入力して「コードでログイン」を押してください。');
    } catch (e: any) {
      Alert.alert('エラー', e?.message || String(e));
    } finally {
      setSending(false);
    }
  };

  // ---- 再送 ----
  const resend = async () => {
    const emRaw = String(email || '').trim();
    const em = emRaw.toLowerCase();

    if (!isValidEmail(emRaw)) {
      setInfo('正しいメールアドレスを記入してください。');
      return;
    }
    if (inCooldown) {
      setInfo(`短時間に連続して送信できません。${remainSec}秒後にお試しください。`);
      return;
    }

    setSending(true);
    try {
      await sendOtp(em, !!p.createUser);
      setInfo('再送しました。数分待って受信箱／迷惑メールをご確認ください。');
    } catch (e: any) {
      Alert.alert('再送に失敗しました', e?.message || e);
    } finally {
      setSending(false);
    }
  };

  // ---- 「コードでログイン」 ----
  const handleShortCodeLogin = async () => {
    try {
      const emRaw = String(email || '').trim();
      const em = emRaw.toLowerCase();
      const tok = String(code || '').trim();

      if (!em || !tok) {
        Alert.alert('入力エラー', 'メールと6桁コードを入力してください');
        return;
      }

      const { error: vError } = await supabase.auth.verifyOtp({ email: em, token: tok, type: 'email' });
      if (vError) throw vError;

      // auth.user と profiles を念のためリンク
      try {
        const { data } = await supabase.auth.getSession();
        const jwt = data?.session?.access_token;
        if (jwt) {
          const base = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
          await fetch(base + '/functions/v1/link-auth-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt },
          }).catch(() => {});
        }
      } catch {}

      // ★ トリガを書き込む（確実に）
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(TRIGGER_AFTER_LOGIN, '1');
          window.localStorage.removeItem('onboard:show_step1_once'); // 念のため
          console.debug('[SignIn] trigger set -> 1');
        }
      } catch {}

      // ★ 正しい reset ネスト（Tabs 内の Rivals へ fromLogin:true を渡す）
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'Tabs',
            state: {
              index: 0,
              routes: [{ name: 'Rivals', params: { fromLogin: true } }],
            },
          },
        ],
      });
    } catch (e: any) {
      console.error('[otp login] error:', e);
      Alert.alert('ログイン失敗', String(e?.message || e));
    }
  };

  // ---- 画面遷移パラメータからの初期化（autoSend 対応） ----
  useEffect(() => {
    if (p.info) setInfo(p.info);
    if (p.awaitCode) setAwaitCode(true);

    (async () => {
      const em = String(p.email || '').trim().toLowerCase();
      if (!em || !p.autoSend) return;
      if (inCooldown) return;

      setSending(true);
      try {
        await sendOtp(em, !!p.createUser);
        setInfo('確認コードを送信しました。メールをご確認ください。届いた6桁を入力し「コードでログイン」を押してください。');
        setAwaitCode(true);
      } catch (e: any) {
        setInfo(String(e?.message || e));
      } finally {
        setSending(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.autoSend]);

  const loginLabel = sending ? '送信中…' : (inCooldown ? `クールダウン中(${remainSec}s)…` : 'ログイン');
  const resendLabel = sending ? '再送中…' : (inCooldown ? `(${remainSec}s）` : '再送');

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F7FB' }}>
      <View style={{ height: 60, backgroundColor: '#2F80B9', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 21, fontWeight: '900' }}>サインイン</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ backgroundColor: '#E7F3FB', borderRadius: 12, padding: 20, marginTop: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 10 }}>このアプリの目的</Text>
          <Text style={{ fontSize: 16, textAlign: 'center' }}>勉強記録を提出して学習を習慣化しよう</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 18, marginTop: 28 }}>
          <View style={{ flex: 1, backgroundColor: '#F4FAFC', borderRadius: 12, padding: 18 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10 }}>高校１年生まで</Text>
            <Text style={{ textAlign: 'center' }}>3日連続の未提出で{'\n'}連続記録リセット</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#F4FAFC', borderRadius: 12, padding: 18 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10 }}>高校２年生以上</Text>
            <Text style={{ textAlign: 'center' }}>2日連続で未提出で{'\n'}連続記録リセット</Text>
          </View>
        </View>

        <Text style={{ textAlign: 'center', marginTop: 28, lineHeight: 24 }}>
          初回ログインは新規登録ボタンから{'\n'}プロフィール情報をご登録ください
        </Text>

        <Text style={{ marginTop: 24, marginBottom: 8, fontWeight: '800' }}>メールアドレス</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="example@domain.jp"
          keyboardType="email-address"
          autoCapitalize="none"
          style={{ backgroundColor: '#fff', borderColor: '#C9D4DF', borderWidth: 1, borderRadius: 12, padding: 14 }}
        />

        {info ? (
          <View style={{ marginTop: 16, backgroundColor: '#EAF4FF', borderWidth: 1, borderColor: '#9FC1E6', borderRadius: 12, padding: 12 }}>
            <Text style={{ color: '#1F4F7A' }}>{info}</Text>
          </View>
        ) : null}

        {awaitCode ? (
          <View style={{ marginTop: 16 }}>
            <Text style={{ marginBottom: 8, fontWeight: '800' }}>メールに届いた6桁コード</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor="#9AA4B2"
              keyboardType="number-pad"
              style={{ backgroundColor: '#fff', borderColor: '#C9D4DF', borderWidth: 1, borderRadius: 12, padding: 14, letterSpacing: 2 }}
              maxLength={6}
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
              <TouchableOpacity onPress={handleShortCodeLogin}
                style={{ backgroundColor: '#4DA3DD', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>コードでログイン</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={resend} disabled={sending || inCooldown}
                style={{ backgroundColor: '#9FBFD8', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10, opacity: (sending || inCooldown) ? 0.6 : 1 }}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>{resendLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 }}>
          <TouchableOpacity onPress={goRegister}
            style={{ backgroundColor: '#4DA3DD', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 12, opacity: sending ? 0.6 : 1 }}>
            <Text style={{ color: '#fff', fontWeight: '900' }}>新規登録</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={tryLogin} disabled={sending || inCooldown}
            style={{ backgroundColor: '#4DA3DD', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 12, opacity: (sending || inCooldown) ? 0.6 : 1 }}>
            <Text style={{ color: '#fff', fontWeight: '900' }}>{loginLabel}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
