// app/src/hooks/useA2HS.ts
import * as React from 'react';

type DeferredPrompt = any;

/** PWA: beforeinstallprompt を捕捉して、任意のタイミングで案内/プロンプトを出す */
export function useA2HS() {
  const isWeb = typeof window !== 'undefined';
  const [supported, setSupported] = React.useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = React.useState<DeferredPrompt | null>(null);
  const [openGuide, setOpenGuide] = React.useState(false);

  React.useEffect(() => {
    if (!isWeb) return;

    // iOSは beforeinstallprompt が発火しないので、Safari判定でガイドのみ出せるように
    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (window as any).navigator?.standalone;

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as any);
      setSupported(true);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    // iOS Safari の場合はプロンプトが無いので、機能自体は「ガイド表示のみ」をサポート
    if (isIOS && !isStandalone) {
      setSupported(true);
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    };
  }, [isWeb]);

  /** 実際のブラウザ標準プロンプトを表示（Android/Chromeなど） */
  async function showNativePrompt() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice; // accepted / dismissed
      } catch {}
      setDeferredPrompt(null);
    }
  }

  /** ガイドモーダルを開く（iOSはガイドのみ、Androidはネイティブ+ガイドの二段構えが安全） */
  function showGuide() {
    setOpenGuide(true);
  }
  function hideGuide() {
    setOpenGuide(false);
  }

  return { supported, deferredPrompt, showNativePrompt, openGuide, showGuide, hideGuide };
}