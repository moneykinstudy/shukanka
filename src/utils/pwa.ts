// src/utils/pwa.ts
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  const byMedia = window.matchMedia?.('(display-mode: standalone)').matches; // Chrome/Edge/Android
  // iOS Safari（ホーム追加アプリ）
  const byIOSStandalone = (navigator as any).standalone === true;
  return !!(byMedia || byIOSStandalone);
}
