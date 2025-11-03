// app/src/utils/onesignal-web.ts
const APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '';
declare global { interface Window { OneSignalDeferred?: any[]; } }

async function loadSDK(){
  if ((window as any).OneSignal) return;
  await new Promise<void>((res, rej)=>{
    const s = document.createElement('script');
    s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    s.async = true; s.defer = true;
    s.onload = ()=>res(); s.onerror = ()=>rej(new Error('OS SDK load failed'));
    document.head.appendChild(s);
  });
}

export async function initOneSignal(): Promise<boolean> {
  if (!APP_ID) { console.warn('ONESIGNAL APP_ID missing'); return false; }
  await loadSDK();
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  return await new Promise<boolean>((res)=>{
    window.OneSignalDeferred!.push(async (OneSignal: any)=>{
      try {
        await OneSignal.init({
          appId: APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerParam: { scope: '/' },
          serviceWorkerPath: 'OneSignalSDKWorker.js',
          serviceWorkerUpdaterPath: 'OneSignalSDKUpdaterWorker.js',
        });
        res(true);
      } catch { res(false); }
    });
  });
}

export async function requestOneSignalPermission():
  Promise<'granted'|'denied'|'default'|'unsupported'> {
  await initOneSignal();
  const OneSignal = (window as any).OneSignal;
  if (!OneSignal) return 'unsupported';
  const st = await OneSignal.Notifications.getPermissionStatus();
  if (st === 'granted') return 'granted';
  return await OneSignal.Notifications.requestPermission();
}

export async function getOneSignalSubscriptionId(): Promise<string|null> {
  const OneSignal = (window as any).OneSignal;
  if (!OneSignal) return null;
  return await OneSignal.User?.PushSubscription?.getId?.() ?? null;
}

export async function onesignalLogin(externalId: string) {
  await initOneSignal();
  const OneSignal = (window as any).OneSignal;
  if (!OneSignal) return;
  if (OneSignal.login) await OneSignal.login(externalId);
  else if (OneSignal.setExternalUserId) OneSignal.setExternalUserId(externalId);
}
