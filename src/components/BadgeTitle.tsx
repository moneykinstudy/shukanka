import React from 'react';
import { View, Text, ViewProps } from 'react-native';

export function BadgeTitle({ children, style, ...rest }: ViewProps & { children: React.ReactNode }){
  return (
    <View
      style={[{
        alignSelf:'center',
        backgroundColor:'#2F80B9',
        paddingVertical:10, paddingHorizontal:24,
        borderRadius:12, marginTop:12, marginBottom:8
      }, style]}
      {...rest}
    >
      <Text style={{ color:'#fff', fontWeight:'900', letterSpacing:2 }}>{children}</Text>
    </View>
  );
}
