// src/components/GlobalOnboardMount.tsx
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { OnboardOverlay } from './OnboardOverlay';

export default function GlobalOnboardMount() {
  // 診断フラグ（Safariコンソールで window.__ONBOARD_APP と打てば 'mounted' が返る）
  useEffect(() => {
    try { (window as any).__ONBOARD_APP = 'mounted'; } catch {}
  }, []);

  // Webで Portal 先が無ければ用意（安全側）
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const id = 'modal-root';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
    }
  }, []);

  // これだけで OK（Portal で body 直下に最前面表示される）
  return <OnboardOverlay />;
}
