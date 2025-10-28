import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';

export type Rival = {
  user_id?: string;
  rankLabel: 'S'|'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I';
  nickname: string;
  grade?: string;
  streakDays: number;
};

// S..I → I..X（Roman）
const letterToRoman: any = { S:'X', A:'IX', B:'VIII', C:'VII', D:'VI', E:'V', F:'IV', G:'III', H:'II', I:'I' };
const romanIconMap: any = {
  I:  require('../assets/rank/I.png'),
  II: require('../assets/rank/II.png'),
  III:require('../assets/rank/III.png'),
  IV: require('../assets/rank/IV.png'),
  V:  require('../assets/rank/V.png'),
  VI: require('../assets/rank/VI.png'),
  VII:require('../assets/rank/VII.png'),
  VIII:require('../assets/rank/VIII.png'),
  IX: require('../assets/rank/IX.png'),
  X:  require('../assets/rank/X.png'),
};

export function RivalCard({ rival, onPress }: { rival: Rival; onPress?: ()=>void }){
  const icon = romanIconMap[letterToRoman[rival.rankLabel] ?? 'I'];
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}
      style={{ backgroundColor:'#fff', borderRadius:14, borderWidth:1, borderColor:'#E5E9EF', padding:12 }}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
        <View style={{
          width:40, height:40, borderRadius:20, overflow:'hidden',
          alignItems:'center', justifyContent:'center',
          backgroundColor:'#E7EEF5', borderWidth:1, borderColor:'#E5E9EF', position:'relative'
        }}>
          <Image source={icon} style={{ width:40, height:40 }} resizeMode="contain" />
</View>
        <View style={{ flex:1 }}>
          <Text style={{ fontWeight:'800' }}>{`Rank：${rival.rankLabel}`}</Text>
          <Text style={{ color:'#333' }}>{`${rival.nickname}・${rival.grade ?? '学年'}`}</Text>
        </View>
      </View>
      <View style={{ borderWidth:2, borderColor:'#D9E1EA', borderRadius:16, paddingVertical:18, paddingHorizontal:12, marginTop:12, alignItems:'center' }}>
        <Text style={{ color:'#555', marginBottom:6 }}>連続達成</Text>
        <Text style={{ fontSize:28, fontWeight:'900', letterSpacing:2 }}>{rival.streakDays} 日目</Text>
      </View>
    </TouchableOpacity>
  );
}
