import React from 'react';
import { View, Text, ScrollView } from 'react-native';

export default function Rivals(){
  return (
    <View style={{ flex:1, backgroundColor:'#F3F7FB' }}>
      <View style={{ backgroundColor:'#2F80B9', paddingTop:18, paddingHorizontal:16, paddingBottom:14 }}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
          <View style={{ width:24 }} />
          <Text style={{ color:'#fff', fontSize:22, fontWeight:'800' }}>ライバルの連続達成</Text>
          <View style={{ minWidth:24, alignItems:'flex-end' }} />
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding:16 }}>
        <Text>Minimal screen OK</Text>
      </ScrollView>
    </View>
  );
}
