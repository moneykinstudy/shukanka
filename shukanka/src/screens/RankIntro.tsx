import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

type R = { params?: { email?: string; nonce?: string } };

const Box: React.FC<{label:string, img:any, caption:string}> = ({label, img, caption}) => (
  <View style={{ width:'31%', marginBottom:32 }}>
    <Text style={{ textAlign:'center', fontSize:22, fontWeight:'800', marginBottom:12 }}>{label}</Text>
    <View style={{
      aspectRatio:1, borderRadius:24, borderWidth:2, borderColor:'#D0D6DE',
      alignItems:'center', justifyContent:'center', overflow:'hidden', backgroundColor:'#fff'
    }}>
      <Image source={img} style={{ width:'100%', height:'100%', resizeMode:'cover' }} />
    </View>
    <Text style={{ textAlign:'center', marginTop:16, lineHeight:26, fontSize:16 }}>{caption}</Text>
  </View>
);

export default function RankIntro() {
  const navigation = useNavigation<any>();
  const route = useRoute<R>();
  const email = String(route?.params?.email ?? '');
  const nonce = String(route?.params?.nonce ?? '');

  const goNext = () => {
    // 導線は現状のまま維持：FirstRankへ email と nonce を渡して reset 遷移
    navigation.reset({
      index: 0,
      routes: [{ name: 'FirstRank', params: { email, nonce } }],
    });
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#F3F7FB' }}>
      {/* ヘッダー帯（中央大見出し） */}
      <View style={{ height:60, backgroundColor:'#2F80B9', alignItems:'center', justifyContent:'center' }}>
        <Text style={{ color:'#fff', fontSize:24, fontWeight:'900' }}>Rankの説明</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical:18, paddingHorizontal:18 }}>
        {/* 3×3 グリッド */}
        <View style={{ flexDirection:'row', justifyContent:'space-between', flexWrap:'wrap' }}>
          <Box label="Rank：S" img={require('../../assets/rank/X.png')}
               caption={'300日連続で\n記録更新した\n習慣化の神様'} />
          <Box label="Rank：A" img={require('../../assets/rank/IX.png')}
               caption={'200日連続で\n記録更新した\n習慣化の仙人'} />
          <Box label="Rank：B" img={require('../../assets/rank/VIII.png')}
               caption={'150日連続で\n記録更新した\n習慣化の達人'} />

          <Box label="Rank：C" img={require('../../assets/rank/VII.png')}
               caption={'100日連続で\n記録更新した\n習慣化の先人'} />
          <Box label="Rank：D" img={require('../../assets/rank/VI.png')}
               caption={'70連続で\n記録更新した\n習慣の成功者'} />
          <Box label="Rank：E" img={require('../../assets/rank/V.png')}
               caption={'50日連続で\n記録更新した\n習慣化の玄人'} />

          <Box label="Rank：F" img={require('../../assets/rank/IV.png')}
               caption={'30日連続で\n記録更新した\n習慣化の素人'} />
          <Box label="Rank：G" img={require('../../assets/rank/III.png')}
               caption={'15日連続で\n記録更新した\n習慣化見習い'} />
          <Box label="Rank：H" img={require('../../assets/rank/II.png')}
               caption={'7日連続で\n記録更新した\n習慣駆け出し'} />
        </View>

        {/* 右下ボタン行 */}
        <View style={{ alignItems:'flex-end', marginTop:8, marginBottom:28 }}>
          <TouchableOpacity onPress={goNext}
            style={{ backgroundColor:'#4DA3DD', paddingVertical:14, paddingHorizontal:25, borderRadius:12 }}>
            <Text style={{ color:'#fff', fontWeight:'900', fontSize:18 }}>理解した</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}