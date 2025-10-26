import { View, Text, ScrollView } from 'react-native';
import { ui } from './_ui';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../app/types';

type P = NativeStackScreenProps<RootStackParamList, 'UserWeek'>;

type Row = { ymd: string; total_minutes: number; details: {subject:string, minutes:number}[] | null };

export default function UserWeek({ route }: P){
  const id = route.params?.id!;
  const [rows,setRows] = useState<Row[]>([]);

  useEffect(()=>{ (async()=>{
    const { data, error } = await supabase
      .from('v_weekly_summary')
      .select('ymd,total_minutes,details')
      .eq('user_id', id)
      .order('ymd', { ascending:false });
    if(!error) setRows((data ?? []) as any);
  })(); },[id]);

  const list = useMemo(()=>rows.map(r => ({
    ymd: r.ymd,
    total: r.total_minutes,
    subjects: (r.details ?? []).map(d => `${d.subject}:${d.minutes}分`).join(' / ')
  })),[rows]);

  return (
    <View style={ui.page}>
      <View style={ui.header}><Text style={ui.hTitle}>ニックネームさんの今週</Text></View>
      <ScrollView style={ui.body}>
        {list.length===0 ? <Text>直近7日のデータがありません</Text> : null}
        {list.map((d,i)=>(
          <View key={i} style={ui.card}>
            <Text style={{fontWeight:'700'}}>{d.ymd}</Text>
            <Text>合計 {d.total} 分</Text>
            {!!d.subjects && <Text style={{color:'#666'}}>{d.subjects}</Text>}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
