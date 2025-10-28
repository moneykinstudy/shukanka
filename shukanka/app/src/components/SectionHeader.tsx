import React from 'react';
import { View, Text } from 'react-native';
export function SectionHeader({ title }: { title: string }){
  return (
    <View style={{ flexDirection:'row', alignItems:'center', marginBottom:8 }}>
      <Text style={{ fontWeight:'700', fontSize:16 }}>{title}</Text>
    </View>
  );
}
