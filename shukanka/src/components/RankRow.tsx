import React from 'react';
import { View, Text } from 'react-native';
export function RankRow({ rank, name, minutes, isMe }:{
  rank:number; name:string; minutes:number; isMe?:boolean;
}){
  return (
    <View style={{
      flexDirection:'row', alignItems:'center', justifyContent:'space-between',
      paddingVertical:10, borderBottomWidth:1, borderColor:'#f0f3f7'
    }}>
      <View style={{flexDirection:'row', alignItems:'center', gap:12}}>
        <Text style={{ width:28, textAlign:'right', fontVariant:['tabular-nums'], fontWeight:'700', color:isMe?'#0b79bf':'#111' }}>{rank}</Text>
        <Text style={{ fontWeight:isMe?'800':'600', color:isMe?'#0b79bf':'#222' }}>{name || '（未設定）'}</Text>
      </View>
      <Text style={{ fontVariant:['tabular-nums'], fontWeight:'700' }}>{minutes} 分</Text>
    </View>
  );
}
