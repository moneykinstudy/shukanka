// app/src/components/OnboardOverlay.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import ReactDOM from 'react-dom';

// ========= Keys =========
const TRIGGER_AFTER_LOGIN = 'onboard:trigger_after_login';
const RESUME_STEP_KEY     = 'onboard:resume_step';
const SETUP_DONE_KEY      = 'onboard:setup_done:v1';
// ★追加：PWA 初回起動を PWA 側で検知するためのフラグ（Safari⇄PWAの storage 分離対策）
const PWA_FIRST_RUN_KEY   = 'onboard:pwa_first_run_done';

// ========= OneSignal =========
const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '';
declare global { interface Window { OneSignalDeferred?: any[]; OneSignal?: any; } }

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPod/i.test(ua)) return true;
  const isApple = (navigator as any).vendor === 'Apple Computer, Inc.';
  const isMacTouch = navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1;
  return /iPad/i.test(ua) || (isApple && isMacTouch);
}
function isStandalone() {
  if (typeof window === 'undefined') return false;
  // @ts-ignore
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any)?.standalone === true;
}
function canAskWebNotification(): boolean {
  if (typeof window === 'undefined') return false;
  const https = location.protocol === 'https:';
  const hasSW = 'serviceWorker' in navigator;
  // iOS は PWA（standalone）でのみ許可ダイアログが出せる
  return https && hasSW && (!isIOS() || isStandalone());
}

async function loadOneSignalSDK() {
  if (typeof window === 'undefined') return;
  if (window.OneSignal) return;
  await new Promise<void>((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    s.async = true; s.defer = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error('OneSignal SDK load failed'));
    document.head.appendChild(s);
  });
}
async function initOneSignal(): Promise<boolean> {
  if (!ONESIGNAL_APP_ID) { console.warn('[OneSignal] APP_ID missing'); return false; }
  await loadOneSignalSDK();
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  return await new Promise<boolean>((resolve) => {
    window.OneSignalDeferred!.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerParam: { scope: '/' },
          serviceWorkerPath: 'OneSignalSDKWorker.js',
          serviceWorkerUpdaterPath: 'OneSignalSDKUpdaterWorker.js',
        });
        resolve(true);
      } catch (e) {
        console.warn('[OneSignal.init] failed:', e);
        resolve(false);
      }
    });
  });
}
async function requestOneSignalPermission():
  Promise<'granted'|'denied'|'default'|'unsupported'> {
  if (!canAskWebNotification()) return 'unsupported';
  const ok = await initOneSignal();
  if (!ok) return 'unsupported';
  const OneSignal = window.OneSignal;
  if (!OneSignal) return 'unsupported';
  const st = await OneSignal.Notifications.getPermissionStatus();
  if (st === 'granted') return 'granted';
  return await OneSignal.Notifications.requestPermission();
}
async function getOneSignalSubscriptionId(): Promise<string | null> {
  const OneSignal = window.OneSignal;
  if (!OneSignal) return null;
  return (await OneSignal.User?.PushSubscription?.getId?.()) ?? null;
}
async function onesignalLoginExternalId(externalId: string) {
  const ok = await initOneSignal();
  if (!ok) return;
  const OneSignal = window.OneSignal;
  if (!OneSignal) return;
  if (OneSignal.login) await OneSignal.login(externalId);
  else if (OneSignal.setExternalUserId) OneSignal.setExternalUserId(externalId);
}

type Step = 1 | 2;

export function OnboardOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>(2);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const openWithStep = useCallback((st: Step) => {
    setStep(st);
    setVisible(true);
  }, []);

  // 1) ログイン直後のトリガーに応じて開く
  const tryOpenFromTrigger = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;
      if (window.localStorage.getItem(SETUP_DONE_KEY) === 'done') return;
      const trig = window.localStorage.getItem(TRIGGER_AFTER_LOGIN);
      if (trig === '1') {
        const st = (isIOS() && !isStandalone()) ? 1 : 2;
        openWithStep(st);
      }
    } catch {}
  }, [openWithStep]);

  // 2) Safari で Step1 を押して閉じたあと、PWA に切替えたら Step2 を再開
  const tryResumeStep2 = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;
      if (window.localStorage.getItem(SETUP_DONE_KEY) === 'done') return;
      if (visible) return;
      const shouldResume = isStandalone() && window.localStorage.getItem(RESUME_STEP_KEY) === '2';
      if (shouldResume) {
        openWithStep(2);
        window.localStorage.removeItem(RESUME_STEP_KEY);
      }
    } catch {}
  }, [visible, openWithStep]);

  // ★3) PWA（standalone）での「初回起動」時は、Safari 側のフラグに依存せず Step2 を自動表示
  const tryPwaFirstRunStep2 = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;
      if (window.localStorage.getItem(SETUP_DONE_KEY) === 'done') return;
      if (!isStandalone()) return;          // PWA でのみ実行
      if (visible) return;
      const firstRunDone = window.localStorage.getItem(PWA_FIRST_RUN_KEY) === '1';
      if (!firstRunDone) {
        openWithStep(2);
        window.localStorage.setItem(PWA_FIRST_RUN_KEY, '1');
      }
    } catch {}
  }, [visible, openWithStep]);

  // 初期チェック
  useEffect(() => {
    tryOpenFromTrigger();
    tryResumeStep2();
    tryPwaFirstRunStep2();
  }, [tryOpenFromTrigger, tryResumeStep2, tryPwaFirstRunStep2]);

  // ナビ依存なしの再チェック（表示状態や visibility 変化、短時間のポーリング）
  useEffect(() => {
    const recheck = () => {
      tryOpenFromTrigger();
      tryResumeStep2();
      tryPwaFirstRunStep2();
    };
    const onVis = () => { if (document.visibilityState === 'visible') recheck(); };
    window.addEventListener('focus', recheck);
    window.addEventListener('popstate', recheck);
    document.addEventListener('visibilitychange', onVis);
    const t = setInterval(recheck, 1500);
    setTimeout(() => clearInterval(t), 6000);
    return () => {
      window.removeEventListener('focus', recheck);
      window.removeEventListener('popstate', recheck);
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(t);
    };
  }, [tryOpenFromTrigger, tryResumeStep2, tryPwaFirstRunStep2]);

  // 閉じる時だけトリガーを消す
  const clearTrigger = () => { try { if (typeof window !== 'undefined') window.localStorage.removeItem(TRIGGER_AFTER_LOGIN); } catch {} };
  const closeOverlay = () => { clearTrigger(); setVisible(false); };

  // Step1: A2HS 後に閉じる（PWA へ切替後に Step2 を開かせるためのフラグ）
  const handleCloseAfterA2HS = () => {
    try { if (typeof window !== 'undefined') window.localStorage.setItem(RESUME_STEP_KEY, '2'); } catch {}
    closeOverlay();
  };

  // Step2: 通知有効化
  const handleEnablePush = async () => {
    try {
      if (!canAskWebNotification()) {
        if (isIOS() && !isStandalone()) {
          Alert.alert('ご案内', 'iPhoneでは、ホーム画面に追加したPWAとして起動した場合のみ通知を許可できます。先にホーム画面に追加してから再実行してください。');
        } else {
          Alert.alert('ご案内', 'この環境では通知を有効化できません（https/ServiceWorkerが必要です）。');
        }
        return;
      }
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (userId) await onesignalLoginExternalId(userId);

      const perm = await requestOneSignalPermission();
      if (perm === 'granted') {
        const subId = await getOneSignalSubscriptionId();
        if (subId && userId) {
          await supabase.from('push_tokens').upsert({
            user_id: userId,
            token: subId,
            platform: 'web',
            provider: 'onesignal',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,token' });
        }
      } else if (perm === 'unsupported') {
        Alert.alert('ご案内', 'この環境では通知許可のダイアログを表示できません。');
      }
    } catch (e: any) {
      Alert.alert('通知の設定に失敗しました', String(e?.message || e));
    }
  };

  // Step2: 閉じる（今後表示しない）
  const handleCloseStep2 = () => {
    try { if (dontShowAgain && typeof window !== 'undefined') window.localStorage.setItem(SETUP_DONE_KEY, 'done'); } catch {}
    closeOverlay();
  };

  if (!visible) return null;

  // ---- Web は Portal で body 直下に描画（前面固定化）
  const content = (
    <View
      style={{
        position: 'fixed',
        inset: 0 as any,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center', justifyContent: 'center',
        padding: 16, zIndex: 2147483647
      }}
    >
      <View style={{ width: '100%', maxWidth: 480, backgroundColor: '#fff', borderRadius: 16, padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 8 }}>
          初回設定のご案内 {`(Step ${step}/2)`}
        </Text>

        {step === 1 && (
          <>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 4 }}>ホーム画面に追加（iPhone）</Text>
            <Text style={{ color: '#475467', lineHeight: 22, marginBottom: 10 }}>
              iPhoneでは通知を使う前に「ホーム画面に追加」してPWAとして起動する必要があります。
              Safariの共有（□↑）→「ホーム画面に追加」→ 追加したアイコンから起動してください。
            </Text>
            <View style={{ gap: 10, flexDirection: 'row' }}>
              <TouchableOpacity onPress={handleCloseAfterA2HS}
                style={{ backgroundColor: '#1891c5', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 }}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>ホームに追加したら閉じる</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={closeOverlay}
                style={{ backgroundColor: '#e5e7eb', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 }}>
                <Text style={{ fontWeight: '800', color: '#111827' }}>あとで</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 4 }}>ホーム画面に追加</Text>
              <Text style={{ color: '#475467', lineHeight: 22 }}>
                iPhone: 共有 → ホーム画面に追加。Android/Chrome: 右上メニュー → ホーム画面に追加。
              </Text>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 4 }}>通知を有効にする</Text>
              {(!canAskWebNotification() && isIOS() && !isStandalone()) ? (
                <Text style={{ color: '#b42318', lineHeight: 22 }}>
                  iPhoneの通知は「ホーム画面に追加したPWA」でのみ許可できます。ホームのアイコンから開き直してもう一度お試しください。
                </Text>
              ) : (
                <Text style={{ color: '#475467', lineHeight: 22 }}>
                  学習の提出忘れを防ぐため、プッシュ通知の有効化をおすすめします。
                </Text>
              )}
              <TouchableOpacity
                onPress={handleEnablePush}
                disabled={!canAskWebNotification()}
                style={{
                  marginTop: 10, alignSelf: 'flex-start',
                  backgroundColor: canAskWebNotification() ? '#1891c5' : '#94a3b8',
                  borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12
                }}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>通知を有効にする</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setDontShowAgain(v => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <View style={{
                width: 20, height: 20, borderRadius: 4,
                borderWidth: 2, borderColor: '#0ea5e9',
                backgroundColor: dontShowAgain ? '#0ea5e9' : 'transparent'
              }}/>
              <Text style={{ fontSize: 14 }}>この設定は完了済み（今後この案内を表示しない）</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={handleCloseStep2}
                style={{ backgroundColor: '#e5e7eb', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 }}>
                <Text style={{ fontWeight: '800', color: '#111827' }}>閉じる</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    const root = document.getElementById('modal-root') || (() => {
      const d = document.createElement('div'); d.id = 'modal-root'; document.body.appendChild(d); return d;
    })();
    return ReactDOM.createPortal(content, root);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={closeOverlay}>
      {content}
    </Modal>
  );
}
