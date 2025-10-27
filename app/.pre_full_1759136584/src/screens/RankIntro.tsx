import { View, Text, Button } from 'react-native';
import { ui } from './_ui';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../app/types';

type P = NativeStackScreenProps<RootStackParamList, 'RankIntro'>;

export default function RankIntro({ navigation }: P){
  return (
    <View style={ui.page}>
      <View style={ui.header}><Text style={ui.hTitle}>Rankの説明</Text></View>
      <View style={ui.body}>
        <Text>ここに Rank I〜X の説明（画像は後で追加）。</Text>
        <Button title="理解した" onPress={()=>navigation.replace('FirstRank')} />
      </View>
    </View>
  );
}
