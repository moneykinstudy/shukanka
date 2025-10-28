import React, { useEffect } from 'react';
import { View, Text, Linking, TouchableOpacity } from 'react-native';

const URL = 'https://moneykinmarketing.com/rikei-juken-blog/';

export default function PerksLink() {
  useEffect(() => {
    Linking.openURL(URL).catch(() => {});
  }, []);
  return (
    <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:24 }}>
      <Text style={{ fontWeight:'700', fontSize:16, marginBottom:12 }}>
        外部サイトを開いています…
      </Text>
      <TouchableOpacity
        onPress={() => Linking.openURL(URL)}
        style={{ backgroundColor:'#2F80B9', paddingHorizontal:16, paddingVertical:10, borderRadius:8 }}
      >
        <Text style={{ color:'#fff', fontWeight:'800' }}>リンクを開く</Text>
      </TouchableOpacity>
    </View>
  );
}
