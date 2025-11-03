import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import FooterNav from '../components/FooterNav';

type Profile = {
  nickname: string | null;
  grade_label?: string | null;
  rank_code?: string | null;         // 'I'..'X' を想定
  target_university?: string | null;
  target_faculty?: string | null;
};

const rankIconMap: Record<string, any> = {
  I:  require('../assets/rank/I.png'),
  II: require('../assets/rank/II.png'),
  III:require('../assets/rank/III.png'),
  IV: require('../assets/rank/IV.png'),
  V:  require('../assets/rank/V.png'),
  VI: require('../assets/rank/VI.png'),
  VII:require('../assets/rank/VII.png'),
  VIII:require('../assets/rank/VIII.png'),
  IX: require('../assets/rank/IX.png'),
  X:  require('../assets/rank/X.png'),
};

export default function KnowUser({ route }: any){
  const navigation = useNavigation<any>();
  const p = route?.params || {};
  const userId: string | undefined = p.user_id;
  const nicknameFromParam: string | undefined = p.nickname;

  const [loading, setLoading] = useState(false);
  const [prof, setProf] = useState<Profile | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const [sum7, setSum7] = useState<number | null>(null);

  useEffect(()=>{
    (async ()=>{
      if(!userId) return;
      setLoading(true);
      try{
        const { data:profs } = await supabase
          .from('profiles')
          .select('nickname, grade_label, rank_code, target_university, target_faculty')
          .eq('id', userId).limit(1);
        setProf(profs?.[0] ?? null);

        const { data:logs } = await supabase
          .from('study_logs')
          .select('study_date, minutes')
          .eq('user_id', userId)
          .gte('study_date', dayjs().subtract(30,'day').format('YYYY-MM-DD'));

        const s = new Set<string>((logs||[]).map(r=>String(r.study_date)));
        let c=0; for(let i=1;i<400;i++){ const d=dayjs().subtract(i,'day').format('YYYY-MM-DD'); if(s.has(d)) c++; else break; }
        setStreak(c);

        const from7 = dayjs().subtract(7,'day').format('YYYY-MM-DD');
        const toY   = dayjs().subtract(1,'day').format('YYYY-MM-DD');
        const sum = (logs||[]).filter(r=>r.study_date>=from7 && r.study_date<=toY)
          .reduce((a,b)=>a + Number(b.minutes||0), 0);
        setSum7(sum);
      } finally { setLoading(false); }
    })();
  }, [userId]);

  const nickname = nicknameFromParam ?? (prof?.nickname ?? 'ニックネーム');
  const grade = prof?.grade_label ?? '学年未設定';
  const rankCode = useMemo(()=>{
    const v = (prof?.rank_code ?? 'I').toUpperCase();
    return (rankIconMap[v] ? v : 'I');
  }, [prof?.rank_code]);
  const rankIcon = rankIconMap[rankCode];

  return (
    <View style={{ flex:1, backgroundColor:'#F3F7FB' }}>
      {/* ★ ヘッダー：ライバルの連続達成と同デザイン */}
      <View style={{ backgroundColor:'#2F80B9', paddingTop:18, paddingHorizontal:16, paddingBottom:14 }}>
  <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
    <View style={{ width:24 }} />
    <Text style={{ color:'#fff', fontSize:22, fontWeight:'800' }}>{`${nickname}さんを知る`}</Text>
    <View style={{ minWidth:24, alignItems:'flex-end' }} />
  </View>
</View>
</View>

      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:96 }}>
        {loading ? (
          <View style={{ paddingTop:24, alignItems:'center' }}>
            <ActivityIndicator /><Text style={{ marginTop:8, color:'#666' }}>読み込み中…</Text>
          </View>
        ) : null}

        {/* アイコン中央＋右上に「もっと知る」 */}
        <View style={{ marginTop:12, paddingHorizontal:16, alignItems:'center' }}>
          <View style={{ width:120, height:120, borderRadius:60, overflow:'hidden',
                         backgroundColor:'#E7EEF5', alignItems:'center', justifyContent:'center',
                         borderWidth:1, borderColor:'#E5E9EF' }}>
            <Image source={rankIcon} style={{ width:120, height:120 }} resizeMode="contain" />
          </View>
          <TouchableOpacity
            onPress={()=>navigation.navigate('KnowUserWeek', { user_id:userId, nickname })}
            activeOpacity={0.85}
            style={{ position:'absolute', right:16, top:16,
                     backgroundColor:'#5BA4D6', paddingHorizontal:14, paddingVertical:10, borderRadius:10 }}
          >
            <Text style={{ color:'#fff', fontWeight:'800' }}>もっと知る ▶</Text>
          </TouchableOpacity>
        </View>

        <View style={{ alignItems:'center', marginTop:12 }}>
          <Text style={{ fontSize:20 }}>{`${nickname}・${grade}`}</Text>
        </View>

        {/* Rank & 連続達成 */}
        <View style={{ flexDirection:'row', alignItems:'center',
                       marginTop:16, borderWidth:1, borderColor:'#D9E1EA', borderRadius:12, padding:12 }}>
          <View style={{ flex:1, backgroundColor:'#C9CED6', padding:12, borderRadius:10 }}>
            <Text style={{ color:'#fff', fontWeight:'900' }}>Rank：{rankCode}</Text>
          </View>
          <View style={{ width:12 }} />
          <View style={{ flex:1, borderWidth:1, borderColor:'#D9E1EA', padding:12, borderRadius:10 }}>
            <Text>連続達成</Text>
            <Text style={{ fontWeight:'900', fontSize:22 }}>{streak ?? 0} 日目</Text>
          </View>
        </View>

        {/* 志望大学・学部・直近7日 */}
        <View style={{ marginTop:16 }}>
          <Text style={{ marginBottom:6 }}>志望大学</Text>
          <View style={{ borderWidth:1, borderColor:'#D9E1EA', borderRadius:10, padding:12 }}>
            <Text>{prof?.target_university ?? '未設定'}</Text>
          </View>

          <Text style={{ marginTop:16, marginBottom:6 }}>志望学部</Text>
          <View style={{ borderWidth:1, borderColor:'#D9E1EA', borderRadius:10, padding:12 }}>
            <Text>{prof?.target_faculty ?? '未設定'}</Text>
          </View>

          <Text style={{ marginTop:16, marginBottom:6 }}>直近7日間の総勉強時間</Text>
          <View style={{ borderWidth:1, borderColor:'#D9E1EA', borderRadius:10, padding:12 }}>
            <Text>{sum7 ?? 0} 分</Text>
          </View>
        </View>
      </ScrollView>

      {/* フッター（共通） */}
      <FooterNav active="Rivals" />
    </View>
  );
}
