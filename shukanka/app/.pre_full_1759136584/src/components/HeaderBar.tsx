import React from 'react';
import { View, Text } from 'react-native';

// Rivals の共通スタイルがあればそれを使う
let ui: any = {};
try { ui = require('../screens/_ui').ui; } catch {}

type Props = { title: string };

export default function HeaderBar({ title }: Props){
  if (ui?.header && ui?.hTitle) {
    // ★ Rivals と完全同一（同じスタイル参照）
    return (
      <View style={ui.header}>
        <Text style={ui.hTitle}>{title}</Text>
      </View>
    );
  }
  // フォールバック（あなたが提示した実測値）
  return (
    <View style={{ backgroundColor:'#2F80B9', paddingTop:18, paddingHorizontal:16, paddingBottom:14 }}>
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
        <View style={{ width:24 }} />
        <Text style={{ color:'#fff', fontSize:22, fontWeight:'800' }}>{title}</Text>
        <View style={{ minWidth:24, alignItems:'flex-end' }} />
      </View>
    </View>
  );
}
