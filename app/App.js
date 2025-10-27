import { Text, View } from 'react-native';
console.log('HELLO FROM APP');
console.log('ENV check:', process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'KEY_OK' : 'KEY_NG');
export default function App(){
  return <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text>Env test</Text></View>;
}
