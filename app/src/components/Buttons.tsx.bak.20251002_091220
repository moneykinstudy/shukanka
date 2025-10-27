import React from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

export function PrimaryButton({ title, style, disabled, ...rest }:{
  title: string;
} & TouchableOpacityProps){
  return (
    <TouchableOpacity
      disabled={disabled}
      style={[{
        backgroundColor:'#6FA8CF',
        borderRadius:12, paddingVertical:12, paddingHorizontal:26,
        opacity: disabled ? 0.6 : 1
      }, style]}
      {...rest}
    >
      <Text style={{ color:'#fff', fontWeight:'800', fontSize:16 }}>{title}</Text>
    </TouchableOpacity>
  );
}

export function SecondaryButton({ title, style, disabled, ...rest }:{
  title: string;
} & TouchableOpacityProps){
  return (
    <TouchableOpacity
      disabled={disabled}
      style={[{
        backgroundColor:'#A6C6DD',
        borderRadius:12, paddingVertical:12, paddingHorizontal:26,
        opacity: disabled ? 0.6 : 1
      }, style]}
      {...rest}
    >
      <Text style={{ color:'#fff', fontWeight:'800', fontSize:16 }}>{title}</Text>
    </TouchableOpacity>
  );
}
