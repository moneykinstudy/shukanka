// Minimal PWA bootstrap used by index.ts
(() => {
  if (typeof window === 'undefined') return;

  const isStandalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    // iOS Safari の standalone 判定
    (typeof (navigator as any).standalone !== 'undefined' && (navigator as any).standalone === true);

  try {
    // PWAで開いているときは、Step1(ホーム追加案内)をスキップできるように最低限のフラグを設定
    if (isStandalone) {
      localStorage.setItem('pwa:installed', '1');
      const step = localStorage.getItem('onboard:resume_step');
      if (!step || Number(step) < 2) localStorage.setItem('onboard:resume_step', '2');
    }
  } catch (_) {}

  // Installフックの把握（任意でデバッグ用）
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    (e as any).preventDefault?.();
    (window as any).__bipEvent = e;
    try { localStorage.setItem('pwa:bip:hooked', '1'); } catch (_) {}
  });
})();
export {};
