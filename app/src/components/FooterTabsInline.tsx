import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const PERKS_URL = 'https://moneykinmarketing.com/rikei-juken-blog/';

/**
 * 画面内に設置する「下タブ風フッター」。
 * バックアップのタブ構成・文言に合わせています。
 * - ランキング: name="Rivals"
 * - 学習記録:   name="Submit"
 * - プロフィール: name="Profile"
 * - 受験特典:   外部リンク
 */
export default function FooterTabsInline() {
  const navigation = useNavigation<any>();

  const Item = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex: 1, alignItems:'center', justifyContent:'center', paddingVertical:10 }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={{ fontWeight:'700', color:'#2F80B9' }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View
      style={{
        height: 56,
        flexDirection:'row',
        borderTopWidth:1, borderColor:'#E5E9EF',
        backgroundColor:'#fff'
      }}
    >
      <Item label="ランキング"  onPress={() => navigation.navigate('Rivals')} />
      <Item label="学習記録"    onPress={() => navigation.navigate('Submit')} />
      <Item label="プロフィール" onPress={() => navigation.navigate('Profile')} />
      <Item label="受験特典"    onPress={() => Linking.openURL(PERKS_URL)} />
    </View>
  );
}
