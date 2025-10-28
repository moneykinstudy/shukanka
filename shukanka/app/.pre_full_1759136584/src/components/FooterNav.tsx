import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

type TabKey = 'Rivals' | 'Submit' | 'Profile' | 'Perks';
type Props = { active?: TabKey };

export default function FooterNav({ active }: Props){
  const navigation = useNavigation<any>();

  const go = (tab: TabKey)=>{
    // Tabs 配下へ遷移（どちらの書き方でも届くように両対応）
    try { navigation.navigate('Tabs', { screen: tab }); }
    catch { navigation.navigate(tab as any); }
  };

  const Btn = ({label, tab}:{label:string; tab:TabKey})=>(
    <TouchableOpacity
      onPress={()=>go(tab)}
      style={{ flex:1, alignItems:'center', justifyContent:'center', height:64 }}
      activeOpacity={0.85}
    >
      <Text
        style={{
          fontWeight: '900',
          color: active===tab ? '#2F80B9' : '#2B3A49',
          fontSize: 14
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{
      position:'absolute', left:0, right:0, bottom:0,
      height:72, backgroundColor:'#fff',
      borderTopWidth:1, borderTopColor:'#D9E1EA',
      flexDirection:'row'
    }}>
      <Btn label="ランキング" tab="Rivals" />
      <Btn label="学習記録" tab="Submit" />
      <Btn label="プロフィール" tab="Profile" />
      <Btn label="受験特典" tab="Perks" />
    </View>
  );
}
