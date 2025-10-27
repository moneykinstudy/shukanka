import { View, Text, Button } from 'react-native';
import { ui } from './_ui';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../app/types';

type P = NativeStackScreenProps<RootStackParamList, 'FirstRank'>;

export default function FirstRank({ navigation }: P){
  return (
    <View style={ui.page}>
      <View style={ui.header}><Text style={ui.hTitle}>最初のRank</Text></View>
      <View style={ui.body}>
        <Text style={{fontSize:22, fontWeight:'700', marginBottom:12}}>あなたの Rank : I</Text>
        <Button title="始める" onPress={()=>navigation.replace('Tabs')} />
      </View>
    </View>
  );
}
