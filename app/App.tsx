// app/App.tsx
import React, { useEffect } from 'react';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import AppRoot from './src/app/index';

// ← 既存ファイルの場所に合わせてパスを調整してください
import { OnboardOverlay } from './src/components/OnboardOverlay';

// ---- Web限定：緊急フォールバック（OnboardOverlay が動かないときに DOM で出す）----
function useEmergencyOnboardFallback() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 診断用フラグ（Safariコンソールで window.__ONBOARD_APP と打てば 'mounted' が返る想定）
    try { (window as any).__ONBOARD_APP = 'mounted'; } catch {}

    // Web 以外は不要
    const isWeb = typeof document !== 'undefined';
    if (!isWeb) return;

    // すでに何かしらのモーダルが出ていれば何もしない
    const hasOnboardKeywords = () => {
      const texts = Array.from(document.querySelectorAll('body *')).map(el => (el as HTMLElement).textContent || '');
      return texts.some(t => /初回設定のご案内|ホームに追加|通知を有効にする/.test(t));
    };

    const ensurePortal = () => {
      let d = document.getElementById('modal-root');
      if (!d) {
        d = document.createElement('div');
        d.id = 'modal-root';
        document.body.appendChild(d);
      }
      return d;
    };

    const showEmergencyModal = () => {
      // すでに出ていれば二重に作らない
      if (document.getElementById('__EMERGENCY_ONBOARD__')) return;

      const wrap = document.createElement('div');
      wrap.id = '__EMERGENCY_ONBOARD__';
      Object.assign(wrap.style, {
        position: 'fixed',
        inset: '0',
        background: 'rgba(0,0,0,0.45)',
        zIndex: '2147483647',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      } as CSSStyleDeclaration);

      wrap.innerHTML = `
        <div style="width:100%;max-width:480px;background:#fff;border-radius:16px;padding:20px">
          <div style="font-size:18px;font-weight:800;margin-bottom:8px">初回設定のご案内 (緊急フォールバック)</div>
          <p style="color:#475467;line-height:22px;margin-bottom:10px">
            本来はアプリの OnboardOverlay で表示されるはずですが、いまはバンドル内でモジュールが動作していない可能性があります。
            ひとまずこの画面で「ホーム画面に追加」の案内を表示しています。
          </p>
          <div style="margin-bottom:12px">
            <div style="font-size:16px;font-weight:700;margin-bottom:4px">ホーム画面に追加（iPhone）</div>
            <div style="color:#475467;line-height:22px">
              Safariの共有（□↑）→「ホーム画面に追加」→ 追加したアイコンから起動してください。
            </div>
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end">
            <button id="__EMERGENCY_CLOSE__" style="background:#e5e7eb;border-radius:8px;padding:10px 12px;font-weight:800">閉じる</button>
          </div>
        </div>
      `;
      wrap.querySelector('#__EMERGENCY_CLOSE__')?.addEventListener('click', () => {
        try { localStorage.removeItem('onboard:trigger_after_login'); } catch {}
        wrap.remove();
      });

      document.body.appendChild(wrap);
      // Portal先も用意（OnboardOverlay 本体が後から動き出した時のため）
      ensurePortal();
    };

    // 起動後しばらく待ってから判定（アプリ側の初期レンダリングを待つ）
    const t1 = window.setTimeout(() => {
      let trig = null;
      try { trig = window.localStorage.getItem('onboard:trigger_after_login'); } catch {}
      const shouldOpen = trig === '1';

      // すでに本物の OnboardOverlay が描画されていれば何もしない
      const alreadyVisible = hasOnboardKeywords();

      if (shouldOpen && !alreadyVisible) {
        // → 本物が見えない＝モジュール未実行の可能性 → 緊急モーダルを出す
        showEmergencyModal();
      }
    }, 800); // 0.8秒待機

    return () => { window.clearTimeout(t1); };
  }, []);
}

export default function App() {
  // Web専用の緊急フォールバック（OnboardOverlay が動けばこれが出ることはありません）
  useEmergencyOnboardFallback();

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      {/* アプリ本体（ナビゲーションなど） */}
      <AppRoot />

      {/* 本来はこれが動いてモーダルが出る（Portalで最前面描画） */}
      <OnboardOverlay />
    </SafeAreaProvider>
  );
}
