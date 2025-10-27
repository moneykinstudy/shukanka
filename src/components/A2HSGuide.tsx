// app/src/components/A2HSGuide.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAndroidInstall?: () => void; // Android/Chromeならネイティブプロンプトを呼べる
};

export const A2HSGuide: React.FC<Props> = ({ visible, onClose, onAndroidInstall }) => {
  if (!visible) return null;

  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent || '');

  return (
    <View
      // 簡易オーバーレイ（既存のModal/Portalがあればそちらに差し替えOK）
      style={{
        position: 'fixed' as any, left:0, top:0, right:0, bottom:0,
        backgroundColor:'rgba(0,0,0,0.35)', alignItems:'center', justifyContent:'center', zIndex: 9999
      }}
    >
      <View style={{
        width: '92%', maxWidth: 480, backgroundColor:'#fff', borderRadius:14, borderWidth:1, borderColor:'#E5E9EF',
        padding:16, boxShadow:'0 8px 24px rgba(0,0,0,.12)' as any
      }}>
        <Text style={{ fontSize:18, fontWeight:'800', marginBottom:8 }}>ホーム画面に追加してください</Text>

        {isIOS ? (
          <>
            <Text style={{ color:'#475467', lineHeight:22 }}>
              iPhone / iPad では、Safariで
              <Text style={{ fontWeight:'800' }}> 共有（□↑）</Text>
              をタップ →{' '}
              <Text style={{ fontWeight:'800' }}>ホーム画面に追加</Text>
              を選ぶと勉強をうながす通知が届きます。
            </Text>
          </>
        ) : (
          <>
            <Text style={{ color:'#475467', lineHeight:22, marginBottom:8 }}>
              Android / Chrome では、ホーム画面に追加することで勉強をうながす通知が届きます。
            </Text>
            <TouchableOpacity
              onPress={onAndroidInstall}
              style={{ alignSelf:'flex-start', backgroundColor:'#4DA3DD', paddingHorizontal:12, paddingVertical:8, borderRadius:8, marginBottom:8 }}
            >
              <Text style={{ color:'#fff', fontWeight:'800' }}>ホーム画面に追加（提案を表示）</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height:8 }} />
        <TouchableOpacity onPress={onClose} style={{ alignSelf:'flex-end', paddingVertical:8, paddingHorizontal:10 }}>
          <Text style={{ color:'#2F80B9', fontWeight:'800' }}>閉じる</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};