import React, { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { fetchUserStreakSummary } from '../utils/streak';

type RouteParams = {
  user_id?: string;
  nickname?: string;
  grade?: string;
  streakPrefetch?: number;
};

/** 連続日数→ランク（S..I） */
function rankLabelFromStreak(n: number) {
  if (n >= 300) return 'S';
  if (n >= 200) return 'A';
  if (n >= 150) return 'B';
  if (n >= 100) return 'C';
  if (n >= 70)  return 'D';
  if (n >= 50)  return 'E';
  if (n >= 30)  return 'F';
  if (n >= 15)  return 'G';
  if (n >= 7)   return 'H';
  return 'I';
}
const letterToRoman: Record<string, string> = { S:'X', A:'IX', B:'VIII', C:'VII', D:'VI', E:'V', F:'IV', G:'III', H:'II', I:'I' };
const romanIconMap: Record<string, any> = {
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

/** “直近日からの連日” を数える */
function calcStreakFromDates(dates: string[], todayStr?: string): number {
  if (!dates || dates.length === 0) return 0;
  const set = new Set(dates.map(d => dayjs(d).format('YYYY-MM-DD')));
  let n = 0; let d = dayjs(todayStr || dayjs().format('YYYY-MM-DD'));
  while (set.has(d.format('YYYY-MM-DD'))) { n++; d = d.subtract(1,'day'); }
  return n;
}

/** 数値候補から最良値を一つだけ選ぶ（null/NaN/0優先度を下げ、既存値を守る） */
function chooseBestStreak(candidates: Array<number | null | undefined>, current?: number | null) {
  // 優先度: 有効な正数 > 0（本当に0だと確定しているときのみ） > 既存値 > null
  const nums = candidates.filter(v => typeof v === 'number' && !Number.isNaN(v)) as number[];
  const positives = nums.filter(v => v > 0);
  if (positives.length > 0) return positives[0];
  if (nums.includes(0)) return 0;
  if (typeof current === 'number' && !Number.isNaN(current)) return current;
  return null;
}

export default function KnowUser() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  // 初回 params を保持しつつ、戻ったら route.params をマージ
  const initialParamsRef = useRef<RouteParams>(route?.params || {});
  const params: RouteParams = { ...initialParamsRef.current, ...(route?.params || {}) };

  const userId = String(params.user_id ?? (params as any).id ?? (params as any).uid ?? '');
  const [nickname, setNickname] = useState(params.nickname ?? 'ニックネーム');
  const [grade, setGrade] = useState(params.grade ?? '学年');
  const [desiredUniv, setDesiredUniv] = useState<string>('未設定');
  const [desiredFaculty, setDesiredFaculty] = useState<string>('未設定');

  // 表示用：未確定は null（0 と区別）。prefetch は初期仮値として採用。
  const [streak, setStreak] = useState<number | null>(
    typeof params.streakPrefetch === 'number' ? params.streakPrefetch : null
  );
  const [sum7, setSum7] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // プロフィールは安定取得
  useEffect(() => {
    (async () => {
      if (!userId) return;
      const { data: prof } = await supabase
        .from('profiles')
        .select('nickname, grade, target_university, target_faculty')
        .eq('id', userId)
        .maybeSingle();
      if (prof) {
        if (prof.nickname) setNickname(String(prof.nickname));
        if (prof.grade) setGrade(String(prof.grade));
        if (prof.target_university) setDesiredUniv(String(prof.target_university));
        if (prof.target_faculty) setDesiredFaculty(String(prof.target_faculty));
      }
    })();
  }, [userId]);

  // ★“途中で都度 setStreak しない” — すべての候補を集めて最後に一回だけセット
  const requestIdRef = useRef(0);
  useFocusEffect(
    React.useCallback(() => {
      if (!userId) return;

      const myReq = ++requestIdRef.current;
      let cancelled = false;

      (async () => {
        setLoading(true);
        try {
          const candidates: Array<number | null> = [];

          // 既存表示（prefetch/現値）を候補として維持
          if (typeof streak === 'number') candidates.push(streak);

          // 1) view
          try {
            const { data: v } = await supabase
              .from('v_rivals_streak_ranking')
              .select('streak_days')
              .eq('user_id', userId)
              .maybeSingle();
            if (v && typeof v.streak_days === 'number' && !Number.isNaN(v.streak_days)) {
              candidates.push(v.streak_days);
            }
          } catch {}

          // 2) profiles
          try {
            const { data: p } = await supabase
              .from('profiles')
              .select('streak_days')
              .eq('id', userId)
              .maybeSingle();
            if (p && typeof p.streak_days === 'number' && !Number.isNaN(p.streak_days)) {
              candidates.push(p.streak_days);
            }
          } catch {}

          // 3) study_logs 再計算（1件以上のときだけ）
          try {
            const since = dayjs().subtract(364, 'day').format('YYYY-MM-DD');
            const today = dayjs().format('YYYY-MM-DD');
            const { data: logs, error } = await supabase
              .from('study_logs')
              .select('study_date')
              .eq('user_id', userId)
              .gte('study_date', since)
              .lte('study_date', today);

            if (!error && logs && logs.length > 0) {
              const dates = logs.map(r => String(r.study_date));
              const computed = calcStreakFromDates(dates, today);
              if (!Number.isNaN(computed)) candidates.push(computed);
            }
          } catch {}

          // 最良値を一度だけセット（別リクエストに負けない & 同値ならスキップ）
          if (!cancelled && myReq === requestIdRef.current) {
            const best = chooseBestStreak(candidates, streak);
            setStreak(prev => (best === prev ? prev : best));
          }

          // 直近7日（>0 のときだけ上書き）
          try {
            const { sum7: s7 } = await fetchUserStreakSummary(userId, grade ?? '');
            if (!cancelled && myReq === requestIdRef.current && typeof s7 === 'number' && s7 > 0) {
              setSum7(prev => (prev === s7 ? prev : s7));
            }
          } catch {
            /* 無視：既存値維持 */
          }
        } finally {
          if (!cancelled && myReq === requestIdRef.current) setLoading(false);
        }
      })();

      return () => { cancelled = true; };
    }, [userId, grade]) // UIは変えない
  );

  const rankLetter = useMemo(() => rankLabelFromStreak(streak ?? 0), [streak]);
  const roman = letterToRoman[rankLetter] || 'I';
  const rankIcon = romanIconMap[roman];

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F7FB' }}>
      {/* ヘッダー */}
      <View style={{ height: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2F80B9' }}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate('Tabs', { screen: 'Rivals' });
          }}
          style={{ position:'absolute', left:12, top:12, paddingHorizontal:10, paddingVertical:6, borderRadius:8, backgroundColor:'rgba(255,255,255,0.2)' }}
          activeOpacity={0.9}
        >
          <Text style={{ color:'#fff', fontWeight:'700' }}>＜ 戻る</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 21 }}>{`${nickname}さんを知る`}</Text>
      </View>

      <ScrollView style={{ padding: 16 }}>
        {/* 上部：Rank アイコン＋「もっと知る」 */}
        <View style={{ marginTop:12, paddingHorizontal:16, alignItems:'center' }}>
          <View
            style={{
              width: 120, height: 120, borderRadius: 60,
              backgroundColor: '#E7EEF5', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', borderWidth: 1, borderColor: '#E5E9EF'
            }}
          >
            <Image source={rankIcon} style={{ width: 120, height: 120 }} resizeMode="contain" />
          </View>
          <TouchableOpacity
            onPress={()=>{
              navigation.navigate('KnowUserWeek', { user_id: userId, nickname, grade });
            }}
            activeOpacity={0.85}
            style={{
              position:'absolute', right:16, top:16,
              backgroundColor:'#5BA4D6', paddingHorizontal:14, paddingVertical:10, borderRadius:10
            }}
          >
            <Text style={{ color:'#fff', fontWeight:'800' }}>もっと知る ▶</Text>
          </TouchableOpacity>
        </View>

        {/* ニックネーム・学年 */}
        <View style={{ alignItems:'center', marginTop:12 }}>
          <Text style={{ fontSize: 20 }}>{`${nickname}・${grade}`}</Text>
        </View>

        {/* Rank & 連続達成 */}
        <View
          style={{
            marginTop: 18,
            backgroundColor: '#fff',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#E5E9EF',
            padding: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, backgroundColor: '#BFC7CF', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 20 }}>{`Rank：${rankLetter}`}</Text>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#D9E1EA', borderRadius: 12, paddingVertical: 10, minHeight: 56 }}>
              <Text style={{ color: '#555', marginBottom: 6 }}>連続達成</Text>
              {loading && streak === null ? (
                <ActivityIndicator />
              ) : (
                <Text style={{ fontSize: 26, fontWeight: '900', letterSpacing: 2 }}>
                  {(streak ?? 0)} 日目
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* 志望校等 */}
        <View style={{ height: 18 }} />
        <Text style={{ fontWeight: '800', marginBottom: 6 }}>志望大学</Text>
        <View style={{ backgroundColor:'#fff', borderWidth:1, borderColor:'#E5E9EF', borderRadius:12, padding:12 }}>
          <Text>{desiredUniv}</Text>
        </View>

        <View style={{ height: 14 }} />
        <Text style={{ fontWeight: '800', marginBottom: 6 }}>志望学部</Text>
        <View style={{ backgroundColor:'#fff', borderWidth:1, borderColor:'#E5E9EF', borderRadius:12, padding:12 }}>
          <Text>{desiredFaculty}</Text>
        </View>

        {/* 直近7日間の勉強時間 */}
        <View style={{ height: 14 }} />
        <Text style={{ fontWeight: '800', marginBottom: 6 }}>直近7日間の勉強時間</Text>
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E9EF', borderRadius: 12, padding: 12, minHeight: 48 }}>
          {loading && sum7 === null ? <ActivityIndicator /> : <Text>{(sum7 ?? 0)} 分</Text>}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
