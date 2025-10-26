// app/src/utils/notifySupport.ts
export function canAskWebNotification(): boolean {
  if (typeof window === 'undefined') return false;
  const https = location.protocol === 'https:';
  const hasSW = 'serviceWorker' in navigator;
  const ua = navigator.userAgent || '';
  const iOS = /iPhone|iPad|iPod/i.test(ua);
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as any)?.standalone === true; // iOS PWA
  return https && hasSW && (!iOS || standalone);
}
