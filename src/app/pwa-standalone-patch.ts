/**
 * iOS Safari は appinstalled イベントが発火しないため、
 * display-mode / navigator.standalone で PWA(standalone)を検知し、
 * ローカルフラグを確定させてオンボーディング Step を進める補助スクリプト。
 * アプリ起動時に import されるだけで OK（副作用のみ）。
 */
(function () {
  if (typeof window === 'undefined') return;

  const mm = (q: string) => window.matchMedia && window.matchMedia(q).matches;
  const isStandalone =
    mm('(display-mode: standalone)') ||
    mm('(display-mode: fullscreen)') ||
    mm('(display-mode: minimal-ui)') ||
    (typeof (navigator as any).standalone !== 'undefined' && (navigator as any).standalone === true);

  if (isStandalone) {
    try {
      localStorage.setItem('pwa:installed', '1');
      // 併用しているオンボ完了フラグ名がある場合はここでセットしておくと確実
      // localStorage.setItem('onboard:setup_done:v1', '1');
    } catch (_) {}
  }
})();
