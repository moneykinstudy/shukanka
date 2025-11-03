// app/src/components/SetupModal.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Switch, Platform } from 'react-native';
import { canAskWebNotification } from '../utils/notifySupport';

type Props = {
  visible: boolean;
  onClose: (setDone: boolean) => void;   // 閉じる時に「設定済み」かどうかを渡す
  onEnablePush: () => Promise<void>;     // 通知を有効にする動作（SignIn側で実装）
  onShowA2HS?: () => Promise<void> | void; // A2HS手順を開く/案内（任意）
};

export default function SetupModal({
  visible, onClose, onEnablePush, onShowA2HS
}: Props) {
  const [checked, setChecked] = React.useState(true); // 既定で「設定済み」ON
  if (!visible) return null;

  const isIOS =
    typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  const standalone =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as any)?.standalone === true);

  const pushSupportedHere = canAskWebNotification();

  return (
    <View style={{
      position:'fixed' as any, inset:0, backgroundColor:'rgba(0,0,0,0.45)',
      alignItems:'center', justifyContent:'center', padding:16, zIndex:9999
    }}>
      <View style={{ width:'100%', maxWidth:480, backgroundColor:'#fff', borderRadius:16, padding:20 }}>
        <Text style={{ fontSize:18, fontWeight:'800', marginBottom:8 }}>
          初回設定のご案内
        </Text>

        {/* A2HS（ホーム追加）ガイド */}
        <View style={{ marginBottom:16 }}>
          <Text style={{ fontSize:16, fontWeight:'700', marginBottom:4 }}>ホーム画面に追加（必須）</Text>
          <Text style={{ color:'#475467', lineHeight:22 }}>
            iPhone: Safariの共有 → 「ホーム画面に追加」→ ホームのアイコンから起動してください。
            {"\n"}Android/Chrome: 右上メニュー → 「ホーム画面に追加」。
          </Text>
          {onShowA2HS && (
            <TouchableOpacity onPress={onShowA2HS}
              style={{ marginTop:10, alignSelf:'flex-start', backgroundColor:'#e5e7eb', borderRadius:8, paddingVertical:8, paddingHorizontal:12 }}>
              <Text style={{ fontWeight:'700' }}>手順を見る</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 通知ガイド */}
        <View style={{ marginBottom:16 }}>
          <Text style={{ fontSize:16, fontWeight:'700', marginBottom:4 }}>通知を有効にする</Text>
          {!pushSupportedHere && isIOS && !standalone ? (
            <Text style={{ color:'#b42318', lineHeight:22 }}>
              iPhoneの通知は「ホーム画面に追加したPWA」でのみ許可できます。
              先にホーム追加して、アイコンから起動後に有効化してください。
            </Text>
          ) : (
            <Text style={{ color:'#475467', lineHeight:22 }}>
              学習の提出忘れ防止に役立つため、通知を許可することをおすすめします。
            </Text>
          )}
          <TouchableOpacity
            onPress={onEnablePush}
            disabled={!pushSupportedHere}
            style={{
              marginTop:10, alignSelf:'flex-start',
              backgroundColor: pushSupportedHere ? '#1891c5' : '#94a3b8',
              borderRadius:8, paddingVertical:10, paddingHorizontal:12
            }}>
            <Text style={{ color:'#fff', fontWeight:'800' }}>
              通知を有効にする
            </Text>
          </TouchableOpacity>
        </View>

        {/* 今後表示しないチェック */}
        <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:16 }}>
          <Switch value={checked} onValueChange={setChecked} />
          <Text style={{ fontSize:14 }}>この設定は完了済み（今後この案内を表示しない）</Text>
        </View>

        <View style={{ flexDirection:'row', justifyContent:'flex-end', gap:12 }}>
          <TouchableOpacity onPress={()=>onClose(checked)}
            style={{ backgroundColor:'#e5e7eb', borderRadius:8, paddingVertical:10, paddingHorizontal:12 }}>
            <Text style={{ fontWeight:'800', color:'#111827' }}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
