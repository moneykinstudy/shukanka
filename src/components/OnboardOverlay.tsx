// src/components/OnboardOverlay.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Platform } from 'react-native';

// ========= Keys =========
const TRIGGER_AFTER_LOGIN = 'onboard:trigger_after_login';
const RESUME_STEP_KEY     = 'onboard:resume_step';
const SETUP_DONE_KEY      = 'onboard:setup_done:v1';

// ========= OneSignal =========
const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '';
declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
  }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  const mm = (q: string) => {
    try { return window.matchMedia?.(`(display-mode: ${q})`)?.matches; } catch { return false; }
  };
  if (mm('standalone') || mm('fullscreen') || mm('minimal-ui')) return true;

  // iOS Safari (ホーム追加)
  // @ts-ignore
  if ((navigator as any)?.standalone === true) return true;

  // Androidのホーム追加で付く場合あり
  try {
    if (document?.referrer?.startsWith?.('android-app://')) return true;
  } catch {}

  // 最終手段（環境依存が強いので通常は無効）
  // try {
  //   if (window.history?.length <= 2 && !window.opener) return true;
  // } catch {}

  return false;
}

function getPermission(): 'default' | 'granted' | 'denied' | 'unavailable' {
  try {
    if (typeof Notification === 'undefined') return 'unavailable';
    // iOS PWAのときでも、対応OSなら値が入る
    return Notification.permission as any;
  } catch {
    return 'unavailable';
  }
}

function hasOneSignal(): boolean {
  try {
    return typeof window !== 'undefined' && !!(window.OneSignal || window.OneSignalDeferred);
  } catch { return false; }
}

type Step = 0 | 1 | 2 | 3;
// 0: 非表示, 1: Step1(ホーム追加案内), 2: Step2(通知許可), 3: 完了

export default function OnboardOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [detectedPWA, setDetectedPWA] = useState(false);

  const initFlags = useCallback(() => {
    const trig = localStorage.getItem(TRIGGER_AFTER_LOGIN); // "1" で起動
    const resume = localStorage.getItem(RESUME_STEP_KEY);   // "1" | "2"
    const done = localStorage.getItem(SETUP_DONE_KEY);      // "1"

    const pwa = isStandalone();
    setDetectedPWA(pwa);

    if (done === '1') {
      setVisible(false);
      setStep(0);
      return;
    }

    // 再開復元
    if (resume === '2') {
      setStep(2);
      setVisible(true);
      return;
    }
    if (resume === '1') {
      setStep(1);
      setVisible(true);
      return;
    }

    // 新規トリガー
    if (trig === '1') {
      // すでにPWAならStep2から、PWAでなければStep1から
      const next: Step = pwa ? 2 : 1;
      setStep(next);
      setVisible(true);
      localStorage.setItem(RESUME_STEP_KEY, String(next));
      // ★ここでは TRIGGER を消さない（index.html のブート版や他導線が先に動いた場合の保険）
      return;
    }

    // トリガーがなくても、PWAで初回起動っぽいならStep2案内だけ出して良い（任意）
    if (pwa && getPermission() === 'default') {
      setStep(2);
      setVisible(true);
      localStorage.setItem(RESUME_STEP_KEY, '2');
    }
  }, []);

  useEffect(() => {
    initFlags();
    // PWAの display-mode 変化を拾って安全側に倒す
    const mq = window.matchMedia?.('(display-mode: standalone)');
    const handler = () => {
      if (mq?.matches && step === 1) {
        setStep(2);
        setVisible(true);
        localStorage.setItem(RESUME_STEP_KEY, '2');
      }
    };
    try { mq?.addEventListener?.('change', handler); } catch {}
    return () => { try { mq?.removeEventListener?.('change', handler); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeAll = useCallback(() => {
    setVisible(false);
    setStep(0);
    try {
      localStorage.removeItem(TRIGGER_AFTER_LOGIN);
      localStorage.removeItem(RESUME_STEP_KEY);
      localStorage.setItem(SETUP_DONE_KEY, '1');
    } catch {}
  }, []);

  const gotoStep2 = useCallback(() => {
    setStep(2);
    setVisible(true);
    localStorage.setItem(RESUME_STEP_KEY, '2');
  }, []);

  const handleEnablePush = useCallback(async () => {
    try {
      // iOS 16.4+ PWA はユーザー操作起点で requestPermission が必要
      if (!hasOneSignal()) {
        alert('通知SDKが初期化されていません。数秒待ってから再度お試しください。');
        return;
      }

      if (!ONESIGNAL_APP_ID) {
        alert('OneSignal App ID が設定されていません。');
        return;
      }

      // OneSignal 初期化（何度呼んでもセーフティ）
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OS: any) => {
        try {
          await OS.init({ appId: ONESIGNAL_APP_ID, allowLocalhostAsSecureOrigin: true });

          // iOS Safari(PWA含む)はここでOSのAPI or Notification APIを介して許可ダイアログ
          const permission = getPermission();
          if (permission !== 'granted') {
            await OS.Slidedown.promptPush(); // OneSignalの標準プロンプト（Web）
          }

          // 最終確認
          const finalPerm = getPermission();
          if (finalPerm === 'granted') {
            alert('通知が有効になりました。');
            closeAll();
          } else {
            alert('通知が許可されませんでした。設定アプリから変更できます。');
          }
        } catch (e: any) {
          console.error(e);
          alert('通知の初期化に失敗しました。');
        }
      });
    } catch (e: any) {
      console.error(e);
      alert('通知の設定に失敗しました。');
    }
  }, [closeAll]);

  // ====== UI ======
  if (!visible) return null;

  const isIOS = useMemo(() => {
    try { return /iPad|iPhone|iPod/.test(navigator.userAgent); } catch { return false; }
  }, []);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={() => setVisible(false)}>
      <View style={{
        flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 20
      }}>
        <View style={{ width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 16, padding: 20 }}>
          {step === 1 && (
            <>
              <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>ホーム画面に追加</Text>
              {isIOS ? (
                <Text style={{ color: '#475467', lineHeight: 22 }}>
                  Safari の「共有（□↑）」→「ホーム画面に追加」で、ホームから起動してください。<br />
                  追加したアイコンから起動すると通知設定に進めます。
                </Text>
              ) : (
                <Text style={{ color: '#475467', lineHeight: 22 }}>
                  ブラウザのメニューから「ホーム画面に追加」でインストールしてください。インストール後に再度アプリを開くと通知設定に進めます。
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => setVisible(false)}
                  style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f2f4f7', borderRadius: 10 }}>
                  <Text>後で</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={gotoStep2}
                  style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#0ea5e9', borderRadius: 10 }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>PWA起動済み（次へ）</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ marginTop: 10, fontSize: 12, color: '#667085' }}>
                PWA検知: {String(detectedPWA)}
              </Text>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>通知を有効にする</Text>
              <Text style={{ color: '#475467', lineHeight: 22 }}>
                学習のリマインドのため通知を有効化してください。iOSではユーザー操作が必要です。
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => setVisible(false)}
                  style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f2f4f7', borderRadius: 10 }}>
                  <Text>後で</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleEnablePush}
                  style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#22c55e', borderRadius: 10 }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>通知を有効にする</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ marginTop: 10, fontSize: 12, color: '#667085' }}>
                Permission: {getPermission()}
              </Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
