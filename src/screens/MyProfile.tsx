import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import { getSessionUser } from '../lib/auth';
import { fetchUserStreakSummary } from '../utils/streak';

/* ★提出完了イベント */
import { appEvents, AppEvent } from '../lib/appEvents';

function calcStreakFromDates(dates: string[], todayStr?: string): number {
  if (!dates || dates.length === 0) return 0;
  const set = new Set(dates.map(d => dayjs(d).format('YYYY-MM-DD')));
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

type ProfileRow = {
  id: string | null;
  auth_user_id: string | null;
  email?: string | null;
  full_name?: string | null;
  nickname?: string | null;
  grade?: string | number | null;
  gender?: string | null;
  target_university?: string | null;
  target_faculty?: string | null;
  avatar_url?: string | null;
};

/** “候補群から最良のひとつ”を選び、途中で0に潰されないようにする */
function chooseBestNumber(cands: Array<number | null | undefined>, current?: number | null) {
  const nums = cands.filter(v => typeof v === 'number' && !Number.isNaN(v)) as number[];
  const positives = nums.filter(v => v > 0);
  if (positives.length > 0) return positives[0];
  if (nums.includes(0)) return 0;
  if (typeof current === 'number' && !Number.isNaN(current)) return current;
  return null;
}

/* ★ 次ランクまでの残り日数と次ランク名（閾値は rankLabelFromStreak と対応） */
function nextRankInfo(currentStreak: number) {
  const steps: { min: number; label: string }[] = [
    { min: 7,   label: 'H' },
    { min: 14,  label: 'G' },
    { min: 30,  label: 'F' },
    { min: 50,  label: 'E' },
    { min: 70,  label: 'D' },
    { min: 100, label: 'C' },
    { min: 150, label: 'B' },
    { min: 200, label: 'A' },
    { min: 300, label: 'S' },
  ];
  for (const s of steps) {
    if (currentStreak < s.min) {
      return { remain: s.min - currentStreak, nextLabel: s.label };
    }
  }
  return { remain: 0, nextLabel: 'S' };
}

export default function MyProfile() {
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [nickname, setNickname] = useState<string>('');
  const [grade, setGrade] = useState<string>('');
  const [gender, setGender] = useState<string>('unknown');
  const [desiredUniv, setDesiredUniv] = useState<string>('');
  const [desiredFaculty, setDesiredFaculty] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [streak, setStreak] = useState<number | null>(null);
  const [sum7, setSum7] = useState<number | null>(null);

  const requestIdRef = useRef(0);

  const fetchProfile = useCallback(async (uidOrEmail: string): Promise<ProfileRow | null> => {
    const cols = 'id, auth_user_id, email, full_name, nickname, grade, gender, target_university, target_faculty, avatar_url';

    const byId = await supabase
      .from('profiles')
      .select(cols)
      .or(`id.eq.${uidOrEmail},auth_user_id.eq.${uidOrEmail}`)
      .limit(1)
      .maybeSingle<ProfileRow>();
    if (!byId.error && byId.data) return byId.data;

    const byEmail = await supabase
      .from('profiles')
      .select(cols)
      .ilike('email', uidOrEmail)
      .limit(1)
      .maybeSingle<ProfileRow>();
    if (!byEmail.error && byEmail.data) return byEmail.data;

    return null;
  }, []);

  const loadAll = useCallback(async () => {
    const myReq = ++requestIdRef.current;
    setLoading(true);
    try {
      const me = await getSessionUser();
      if (!me) { if (myReq === requestIdRef.current) setLoading(false); return; }

      const meEmail = (await supabase.auth.getSession()).data.session?.user?.email ?? '';
      const prof = (await fetchProfile(me.id)) ?? (meEmail ? await fetchProfile(meEmail) : null);

      const profileIdForLogs = prof?.id || me.id;
      if (myReq !== requestIdRef.current) return;
      setUserId(profileIdForLogs);

      if (prof) {
        setNickname(String(prof.nickname ?? prof.full_name ?? ''));
        setGrade(String(prof.grade ?? ''));
        setGender(String(prof.gender ?? 'unknown'));
        setDesiredUniv(String(prof.target_university ?? ''));
        setDesiredFaculty(String(prof.target_faculty ?? ''));
        setAvatarUrl(prof.avatar_url ?? null);
      } else {
        setNickname('');
        setGrade('');
        setGender('unknown');
        setDesiredUniv('');
        setDesiredFaculty('');
        setAvatarUrl(null);
      }

      const streakCands: Array<number | null> = [];
      const sum7Cands:   Array<number | null> = [];

      streakCands.push(streak);
      sum7Cands.push(sum7);

      try {
        const a = await fetchUserStreakSummary(profileIdForLogs, String(prof?.grade ?? ''));
        if (typeof a?.streak === 'number') streakCands.push(a.streak);
        if (typeof a?.sum7 === 'number')   sum7Cands.push(a.sum7);
      } catch {}

      const today = dayjs().format('YYYY-MM-DD');
      const since7 = dayjs().subtract(6, 'day').format('YYYY-MM-DD');
      const since365 = dayjs().subtract(364, 'day').format('YYYY-MM-DD');

      const { data: logs, error: logsErr } = await supabase
        .from('study_logs')
        .select('study_date, minutes')
        .eq('user_id', profileIdForLogs)
        .gte('study_date', since365)
        .lte('study_date', today);

      if (!logsErr && Array.isArray(logs)) {
        const dates = Array.from(new Set((logs || []).filter(r => Number(r.minutes) > 0).map(r => String(r.study_date))));
        if (dates.length > 0) {
          const computed = calcStreakFromDates(dates, today);
          streakCands.push(computed);
        } else {
          streakCands.push(0);
        }

        const sum7Calc = (logs || [])
          .filter((r: any) => r.study_date >= since7)
          .reduce((a: number, r: any) => a + (Number(r.minutes) || 0), 0);
        sum7Cands.push(sum7Calc);
      }

      try {
        const { data: v, error } = await supabase
          .from('v_rivals_streak_ranking')
          .select('streak_days')
          .eq('user_id', profileIdForLogs)
          .maybeSingle();
        if (!error && v && typeof v.streak_days === 'number') {
          streakCands.push(v.streak_days);
        }
      } catch {}

      if (myReq === requestIdRef.current) {
        const sBest  = chooseBestNumber(streakCands, streak);
        const s7Best = chooseBestNumber(sum7Cands,   sum7);
        setStreak(prev => (prev === sBest  ? prev : sBest));
        setSum7(prev   => (prev === s7Best ? prev : s7Best));
      }
    } catch (e: any) {
      if (myReq === requestIdRef.current) {
        Alert.alert('読み込みエラー', String(e?.message || e));
      }
    } finally {
      if (myReq === requestIdRef.current) setLoading(false);
    }
  }, [fetchProfile, streak, sum7]);

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange(() => { loadAll(); });
    return () => { try { sub.data?.subscription?.unsubscribe(); } catch(_){} };
  }, [loadAll]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useFocusEffect(React.useCallback(() => { loadAll(); }, [loadAll]));

  useEffect(() => {
    const handler = () => { loadAll(); };

    if (typeof (appEvents as any).on === 'function') {
      (appEvents as any).on(AppEvent.StudySubmitted, handler);
      return () => {
        if (typeof (appEvents as any).off === 'function') {
          (appEvents as any).off(AppEvent.StudySubmitted, handler);
        } else if (typeof (appEvents as any).removeListener === 'function') {
          (appEvents as any).removeListener(AppEvent.StudySubmitted, handler);
        }
      };
    }
    if (typeof (appEvents as any).addListener === 'function') {
      const sub = (appEvents as any).addListener(AppEvent.StudySubmitted, handler);
      return () => { try { sub?.remove?.(); } catch {} };
    }
    return () => {};
  }, [loadAll]);

  const rankLetter = rankLabelFromStreak(streak ?? 0);
  const roman = letterToRoman[rankLetter] || 'I';
  let rankIcon: any = null;
  try { rankIcon = (romanIconMap[roman] ? romanIconMap[roman]() : null); } catch { rankIcon = null; }

  // 次ランク案内の値
  const sNow = Math.max(0, Number(streak ?? 0));
  const { remain, nextLabel } = nextRankInfo(sNow);

  const onMore = () => {
    navigation.navigate('MyWeek', {
      user_id: userId ?? undefined,
      nickname: nickname || undefined,
    });
  };

  if (loading && !userId) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>読み込み中…</Text>
      </View>
    );
  }

  const nicknameLabel = nickname || '未設定';
  const gradeLabel = (grade || '-').toString();
  const genderMap: Record<string,string> = {
    male:'男性', female:'女性', other:'その他', unknown:'未設定',
    男:'男性', 女:'女性', 男性:'男性', 女性:'女性'
  };
  const genderLabel = genderMap[gender] ?? '未設定';

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F6FB' }}>
      <View style={{ height: 60, backgroundColor: '#2F80B9', justifyContent: 'center', paddingHorizontal: 16 }}>
        <Text style={{ color: '#fff', fontSize: 21, fontWeight: '600', textAlign: 'center' }}>あなたのプロフィール</Text>
      </View>

      <ScrollView style={{ padding: 16 }}>
        <View style={{ marginTop: 12, marginBottom: 4 }}>
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <View style={{ width: 130 }} />

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
              onPress={onMore}
            >
              <Text style={{ color:'#fff', fontWeight:'800' }}>もっと見る ▶</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 8 }} />
          <Text style={{ textAlign:'center', fontSize: 20 }}>{`${nicknameLabel}・${gradeLabel}`}</Text>
        </View>

        <View style={{ marginTop:18, backgroundColor:'#fff', borderRadius:16, borderWidth:1, borderColor:'#E5E9EF', padding:12 }}>
          {/* 上段：Rank と 連続達成（レイアウトは従来のまま） */}
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            {/* 左：Rank 表示 */}
            <View style={{ flex:1, backgroundColor:'#BFC7CF', borderRadius:12, paddingVertical:10, paddingHorizontal:11 }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 21 }}>{`Rank：${rankLetter}`}</Text>
            </View>

            <View style={{ width:12 }} />

            {/* 右：連続達成 */}
            <View style={{ flex:1, alignItems:'center', borderWidth:1, borderColor:'#E5E9EF', borderRadius:12, paddingVertical:10, minHeight:56 }}>
              <Text style={{ color:'#555', marginBottom:6 }}>連続達成</Text>
              {loading && streak === null ? <ActivityIndicator /> : (
                <Text style={{ fontSize:26, fontWeight:'900', letterSpacing:2 }}>{(streak ?? 0)} 日目</Text>
              )}
            </View>
          </View>

          {/* ★ Rankパネル“下”の案内文（「○日」「Rank ○」のみ赤） */}
          <View style={{ marginTop:-10, paddingHorizontal:4 }}>
            {remain > 0 ? (
              <Text style={{ color:'#667085', fontSize:12, fontWeight:'700' }}>
                あと{' '}
                <Text style={{ color:'#bb1313ff', fontWeight:'900' }}>{remain}日</Text>
                {' '}達成で{' '}
                <Text style={{ color:'#bb1313ff', fontWeight:'900' }}>Rank {nextLabel}</Text>
                {' '}に昇格
              </Text>
            ) : (
              <Text style={{ color:'#667085', fontSize:12, fontWeight:'700' }}>
                最高ランクです
              </Text>
            )}
          </View>
        </View>

        <View style={{ height:18 }} />
        <Text style={{ fontWeight:'800', marginBottom:6 }}>志望大学</Text>
        <View style={{ backgroundColor:'#fff', borderWidth:1, borderColor:'#E5E9EF', borderRadius:12, padding:12, minHeight:48 }}>
          {loading && desiredUniv === '' ? <ActivityIndicator/> : <Text>{desiredUniv || '未設定'}</Text>}
        </View>

        <View style={{ height:14 }} />
        <Text style={{ fontWeight:'800', marginBottom:6 }}>志望学部</Text>
        <View style={{ backgroundColor:'#fff', borderWidth:1, borderColor:'#E5E9EF', borderRadius:12, padding:12, minHeight:48 }}>
          {loading && desiredFaculty === '' ? <ActivityIndicator/> : <Text>{desiredFaculty || '未設定'}</Text>}
        </View>

        <View style={{ height:14 }} />
        <Text style={{ fontWeight:'800', marginBottom:6 }}>性別</Text>
        <View style={{ backgroundColor:'#fff', borderWidth:1, borderColor:'#E5E9EF', borderRadius:12, padding:12, minHeight:48 }}>
          <Text>{genderLabel}</Text>
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

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { marginTop: 8, color: '#666' },
});
