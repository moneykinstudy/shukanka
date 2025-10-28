import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// ===== PWA Service Worker registration (auto-inject) =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then(regs => {
      const has = regs.some(r => r.active || r.installing || r.waiting);
      if (!has) {
        navigator.serviceWorker.register('/sw.js').catch(e => console.error('SW register fail', e));
      }
    }).catch(console.error);
  });
}
// ===== /PWA SW registration =====
