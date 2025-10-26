import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import { getSessionUser } from '../lib/auth';

function calcStreakFromDates(dates: string[], todayStr?: string): number {
  const set = new Set(dates);
  const today = todayStr || dayjs().format('YYYY-MM-DD');
  let n = 0; let d = dayjs(today);
  while (set.has(d.format('YYYY-MM-DD'))) { n++; d = d.subtract(1,'day'); }
  return n;
}
function rankLabelFromStreak(n: number) {
  if (n >= 300) return 'S';
  if (n >= 200) return 'A';
  if (n >= 150) return 'B';
  if (n >= 100) return 'C';
  if (n >= 70)  return 'D';
  if (n >= 50)  return 'E';
  if (n >= 30)  return 'F';
  if (n >= 14)  return 'G';
  if (n >= 7)   return 'H';
  return 'I';
}
const letterToRoman: Record<string,string> = { S:'X', A:'IX', B:'VIII', C:'VII', D:'VI', E:'V', F:'IV', G:'III', H:'II', I:'I' };
const romanIconMap: Record<string, any> = {
  I:  () => require('../assets/rank/I.png'),
  II: () => require('../assets/rank/II.png'),
  III:() => require('../assets/rank/III.png'),
  IV: () => require('../assets/rank/IV.png'),
  V:  () => require('../assets/rank/V.png'),
  VI: () => require('../assets/rank/VI.png'),
  VII:() => require('../assets/rank/VII.png'),
  VIII:() => require('../assets/rank/VIII.png'),
  IX: () => require('../assets/rank/IX.png'),
  X:  () => require('../assets/rank/X.png'),
};

export default function MyProfile() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState<string>('');
  const [grade, setGrade] = useState<string>('');
  const [gender, setGender] = useState<string>('unknown');
  const [desiredUniv, setDesiredUniv] = useState<string>('');
  const [desiredFaculty, setDesiredFaculty] = useState<string>('');
  const [streak, setStreak] = useState<number | null>(null);
  const [sum7, setSum7] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const user = await getSessionUser();
        if (!user) { setLoading(false); return; }

        const { data: prof } = await supabase
          .from('profiles')
          .select('nickname, grade, gender, target_university, target_faculty, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (prof) {
          if (prof.nickname) setNickname(String(prof.nickname));
          if (prof.grade) setGrade(String(prof.grade));
          if (prof.gender) setGender(String(prof.gender));
          if (prof.target_university) setDesiredUniv(String(prof.target_university));
          if (prof.target_faculty) setDesiredFaculty(String(prof.target_faculty));
          if ((prof as any).avatar_url) setAvatarUrl(String((prof as any).avatar_url));
        }

        const today = dayjs().format('YYYY-MM-DD');
        const since365 = dayjs().subtract(364, 'day').format('YYYY-MM-DD');
        const since7 = dayjs().subtract(6, 'day').format('YYYY-MM-DD');

        const { data: logs } = await supabase
          .from('study_logs')
          .select('study_date, minutes')
          .eq('user_id', user.id)
          .gte('study_date', since365)
          .lte('study_date', today);

        const dates = (logs || []).map((r: any) => String(r.study_date));
        setStreak(calcStreakFromDates(dates, today));

        const sum = (logs || [])
          .filter((r: any) => r.study_date >= since7)
          .reduce((a: number, r: any) => a + (Number(r.minutes) || 0), 0);
        setSum7(sum);
      } finally { setLoading(false); }
    })();
  }, []);

  const rankLetter = rankLabelFromStreak(streak ?? 0);
  const roman = letterToRoman[rankLetter] || 'I';
  let rankIcon: any = null;
  try { rankIcon = (romanIconMap[roman] ? romanIconMap[roman]() : null); } catch { rankIcon = null; }

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F6FB' }}>
      {/* ヘッダー */}
      <View style={{ height: 56, backgroundColor: '#2F80B9', justifyContent: 'center', paddingHorizontal: 16 }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', textAlign: 'center' }}>あなたのプロフィール</Text>
      </View>

      <ScrollView style={{ padding: 16 }}>
        {/* アバター中央＋右端に「もっと見る」 */}
        <View style={{ marginTop: 12, marginBottom: 4 }}>
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <View style={{ width: 130 }} />
            {/* ★ 白い丸枠なし／枠いっぱい表示 */}
            <View style={{
              width:108, height:108, borderRadius:54,
              backgroundColor:'#F2F4F7',
              shadowColor:'#000', shadowOpacity:0.06, shadowRadius:8, shadowOffset:{width:0,height:2},
              overflow:'hidden', alignSelf:'center'
            }}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width:'100%', height:'100%' }} resizeMode="cover" />
              ) : rankIcon ? (
                <Image source={rankIcon} style={{ width:'100%', height:'100%' }} resizeMode="cover" />
              ) : null}
            </View>
            <TouchableOpacity
              style={{
                minWidth:110, alignItems:'center',
                backgroundColor:'#4DA3DD',
                paddingHorizontal:16, paddingVertical:10,
                borderRadius:10,
                shadowColor:'#000', shadowOpacity:0.08, shadowRadius:10, shadowOffset:{width:0,height:4}, marginRight:16,
              }}
              onPress={() => navigation.navigate('MyWeek')}
            >
              <Text style={{ color:'#fff', fontWeight:'800' }}>もっと見る ▶</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 8 }} />
          <Text style={{ textAlign:'center', fontSize: 20 }}>{`${nickname || '未設定'}・${grade || '-'}`}</Text>
        </View>

        {/* Rank & 連続達成 */}
        <View style={{ marginTop:18, backgroundColor:'#fff', borderRadius:16, borderWidth:1, borderColor:'#E5E9EF', padding:12 }}>
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            <View style={{ flex:1, backgroundColor:'#BFC7CF', borderRadius:12, paddingVertical:10, paddingHorizontal:12 }}>
              <Text style={{ color:'#fff', fontWeight:'900', fontSize:20 }}>{`Rank：${rankLetter}`}</Text>
            </View>
            <View style={{ width:12 }} />
            <View style={{ flex:1, alignItems:'center', borderWidth:1, borderColor:'#E5E9EF', borderRadius:12, paddingVertical:10, minHeight:56 }}>
              <Text style={{ color:'#555', marginBottom:6 }}>連続達成</Text>
              {loading && streak === null ? <ActivityIndicator /> : (
                <Text style={{ fontSize:26, fontWeight:'900', letterSpacing:2 }}>{(streak ?? 0)} 日目</Text>
              )}
            </View>
          </View>
        </View>

        {/* 明細 */}
        <View style={{ height:18 }} />
        <Text style={{ fontWeight:'800', marginBottom:6 }}>志望大学</Text>
        <View style={{ backgroundColor:'#fff', borderWidth:1, borderColor:'#E5E9EF', borderRadius:12, padding:12, minHeight:48 }}>
          {loading ? <ActivityIndicator/> : <Text>{desiredUniv || '未設定'}</Text>}
        </View>

        <View style={{ height:14 }} />
        <Text style={{ fontWeight:'800', marginBottom:6 }}>志望学部</Text>
        <View style={{ backgroundColor:'#fff', borderWidth:1, borderColor:'#E5E9EF', borderRadius:12, padding:12, minHeight:48 }}>
          {loading ? <ActivityIndicator/> : <Text>{desiredFaculty || '未設定'}</Text>}
        </View>

        <View style={{ height:14 }} />
        <Text style={{ fontWeight:'800', marginBottom:6 }}>性別</Text>
        <View style={{ backgroundColor:'#fff', borderWidth:1, borderColor:'#E5E9EF', borderRadius:12, padding:12, minHeight:48 }}>
          <Text>{{male:'男性', female:'女性', other:'その他', unknown:'未設定'}[gender] || '未設定'}</Text>
        </View>

        <View style={{ height:14 }} />
        <Text style={{ fontWeight:'800', marginBottom:6 }}>直近7日間の勉強時間</Text>
        <View style={{ backgroundColor:'#fff', borderWidth:1, borderColor:'#E5E9EF', borderRadius:12, padding:12, minHeight:48 }}>
          {loading && sum7 === null ? <ActivityIndicator/> : <Text>{(sum7 ?? 0)} 分</Text>}
        </View>

        <View style={{ height:24 }} />
      </ScrollView>
    </View>
  );
}
