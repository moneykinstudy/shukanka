import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// ★ あなたのオンボード実装を読み込む（パスは合わせて）
import OnboardOverlay from '/Users/teramuratakurou/dev/_restored/study-rank-expo_20251003_163753/app/src/components/OnboardOverlay';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* ここで常駐オーバーレイを描画（条件分岐は内部で制御） */}
      <OnboardOverlay />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
