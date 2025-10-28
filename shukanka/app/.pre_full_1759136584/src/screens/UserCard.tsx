import { View, Text, Button, Image } from 'react-native';
import { ui } from './_ui';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../app/types';

type P = NativeStackScreenProps<RootStackParamList, 'UserCard'>;

export default function UserCard({ route, navigation }: P){
  const id = route.params?.id!;
  const [info,setInfo] = useState<{nickname:string,grade:string,icon_url:string}|null>(null);

  useEffect(()=>{ (async()=>{
    const { data, error } = await supabase
      .from('v_public_profiles')
      .select('nickname,grade,icon_url')
      .eq('id', id).maybeSingle();
    if(!error) setInfo(data as any);
  })(); },[id]);

  return (
    <View style={ui.page}>
      <View style={ui.header}><Text style={ui.hTitle}>ニックネームさんを知る</Text></View>
      <View style={ui.body}>
        {info ? (
          <>
            {info.icon_url ? <Image source={{uri:info.icon_url}} style={{width:72,height:72,borderRadius:36,marginBottom:12}}/> : null}
            <Text style={{fontSize:18,fontWeight:'700'}}>{info.nickname}</Text>
            <Text style={{marginBottom:8}}>{info.grade}</Text>
          </>
        ) : <Text>読み込み中…</Text>}
        <Button title="もっと知る" onPress={()=>navigation.navigate('UserWeek',{id})} />
      </View>
    </View>
  );
}
