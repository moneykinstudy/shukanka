import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import OnboardOverlay from '../components/OnboardOverlay';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <OnboardOverlay />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
