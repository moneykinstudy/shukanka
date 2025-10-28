import React from 'react';
import { ExpoRoot } from 'expo-router';
export default function App(){
  return <ExpoRoot context={require.context('./src/app', true, /.*/)} />;
}
