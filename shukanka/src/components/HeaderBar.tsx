import React from 'react';
import { View, Text, ViewProps } from 'react-native';

export function HeaderBar({ title, right, style, ...rest }:{
  title: string; right?: React.ReactNode;
} & ViewProps){
  return (
    <View style={[{ backgroundColor:'#2F80B9', paddingTop:15.5, paddingBottom:13, paddingHorizontal:16 }, style]} {...rest}>
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
        <View style={{ width:24 }} />
        <Text style={{ color:'#fff', fontSize:21, fontWeight:'800' }}>{title}</Text>
        <View style={{ minWidth:24, alignItems:'flex-end' }}>{right}</View>
      </View>
    </View>
  );
}
