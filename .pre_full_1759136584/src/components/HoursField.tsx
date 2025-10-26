import { View, Text, TextInput } from 'react-native';

export function HoursField({ value, onChange }:{ value:string; onChange:(v:string)=>void }){
  return (
    <View style={{marginTop:12}}>
      <Text style={{fontWeight:'700', marginBottom:6}}>通知時刻（例: 16,19,22,23）</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="0-23の整数をカンマ区切り"
        style={{borderWidth:1,borderColor:'#ddd',borderRadius:10,padding:10,backgroundColor:'#fff'}}
        keyboardType="numbers-and-punctuation"
      />
      <Text style={{opacity:0.7, fontSize:12, marginTop:6}}>保存すると次回以降のリマインドがこの時刻で鳴ります。</Text>
    </View>
  );
}
