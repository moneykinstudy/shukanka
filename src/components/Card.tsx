import React from 'react';
import { View, ViewProps } from 'react-native';
export function Card({ style, ...rest }: ViewProps){
  return <View style={[{ backgroundColor:'#fff', borderRadius:14, padding:14, borderWidth:1, borderColor:'#e5e9ef' }, style]} {...rest} />;
}
