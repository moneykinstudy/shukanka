import React, { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigation, useRoute } from '@react-navigation/native';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { functionsBase } from '../utils/functionsBase';
import { appEvents, AppEvent } from '../lib/appEvents'; // ★ 追加：提出完了イベント購読

type Row = {
  study_date: string;     // 'YYYY-MM-DD' or timestamp string
  subject?: string | null;
  minutes?: number | null;
  memo?: string | null;
};

const SUBJECT_ORDER = ['数学','英語','国語','理科','社会','情報','宿題','その他'] as const;

const Chip = ({ text }: { text: string }) => (
  <View style={{
    alignSelf:'flex-start', backgroundColor:'#D1D8DF',
    borderRadius:8, paddingHorizontal:10, paddingVertical:4, marginBottom:8
  }}>
    <Text style={{ color:'#2B3A49', fontWeight:'800' }}>{text}</Text>
  </View>
);

export default function KnowUserWeek() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // 初回 params を保持（戻ってきても失わない）
  const initialParamsRef = useRef(route?.params || {});
  const p = initialParamsRef.current;
  const userId: string | undefined = p.user_id;
  const nickname: string = p.nickname ?? 'ニックネーム';

  // 今日まで7日（古い→新しい）のフォールバック配列
  const fallbackDays = useMemo(() => {
    const arr: string[] = [];
    for (let i = 6; i >= 0; i--) arr.push(dayjs().subtract(i, 'day').format('YYYY-MM-DD'));
    return arr;
  }, []);

  const [loading, setLoading] = useState(false);
  const [byDate, setByDate] = useState<Record<string, { sums: Record<string, number>, memo?: string }>>({});
  const [daysFromAPI, setDaysFromAPI] = useState<string[] | null>(null);
  const [memoPick, setMemoPick] = useState<{ date: string, memo: string } | null>(null);

  // ★ 追加：提出完了イベントで再読込するためのキー
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const base = functionsBase();
        const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
        const res = await fetch(
          `${base}/get-user-week?user_id=${encodeURIComponent(userId)}`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(anon ? { apikey: anon, Authorization: `Bearer ${anon}` } : {})
            }
          }
        );
        const txt = await res.text();
        if (!res.ok) {
          console.error('[KnowUserWeek] edge error', res.status, txt);
          if (!cancelled) { setByDate({}); setDaysFromAPI(null); setMemoPick(null); }
          return;
        }
        let j: {
          days: string[];
          byDate: Record<string, { sums: Record<string, number>, memo?: string }>;
        };
        try { j = JSON.parse(txt); } catch { console.error('[KnowUserWeek] JSON parse error', txt); return; }

        if (cancelled) return;

        setByDate(j.byDate || {});
        setDaysFromAPI(Array.isArray(j.days) ? j.days : null);

        // freeNote がある日のみ候補にし、ランダムで1件
        const srcDays = (j.days && j.days.length) ? j.days : fallbackDays;
        const candidates = srcDays
          .map(d => ({ d, memo: j.byDate?.[d]?.memo }))
          .filter(x => x.memo && String(x.memo).trim().length > 0) as { d: string, memo: string }[];

        if (candidates.length > 0) {
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          setMemoPick({ date: pick.d, memo: pick.memo });
        } else {
          setMemoPick(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // ★ 変更：提出完了で reloadKey が変わるので依存に含める
  }, [userId, fallbackDays, reloadKey]);

  // ★ 追加：提出完了イベントで即時再読込
  useEffect(() => {
    const handler = () => setReloadKey((k) => k + 1);

    // shimmable: on/off がなければ addListener/remove を使う
    const anyEvents: any = appEvents as any;
    if (typeof anyEvents?.on === 'function' && typeof anyEvents?.off === 'function') {
      anyEvents.on(AppEvent.StudySubmitted, handler);
      return () => anyEvents.off(AppEvent.StudySubmitted, handler);
    }
    const sub = anyEvents?.addListener?.(AppEvent.StudySubmitted, handler);
    return () => { try { sub?.remove?.(); } catch {} };
  }, []);

  const CARD_W = '31%';
  const days = (daysFromAPI && daysFromAPI.length) ? daysFromAPI : fallbackDays;

  return (
    <View style={{ flex:1, backgroundColor:'#F3F7FB' }}>
      <View style={{ height: 60, alignItems:'center', justifyContent:'center', backgroundColor:'#2F80B9' }}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();         // ← pop 戻り（ループ防止）
            } else {
              navigation.navigate('KnowUser', { user_id: userId, nickname }); // 異常系のみ
            }
          }}
          style={{
            position:'absolute', left:12, top:12,
            paddingHorizontal:10, paddingVertical:6,
            borderRadius:8, backgroundColor:'rgba(255,255,255,0.2)'
          }}
        >
          <Text style={{ color:'#fff', fontWeight:'700' }}>＜ 戻る</Text>
        </TouchableOpacity>
        <Text style={{ color:'#fff', fontWeight:'900', fontSize: 21 }}>{`${nickname}さんの今週`}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding:16 }}>
        {loading ? (
          <View style={{ paddingTop:24, alignItems:'center' }}>
            <ActivityIndicator />
            <Text style={{ marginTop:8, color:'#666' }}>読み込み中…</Text>
          </View>
        ) : null}

        <View style={{ flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between' }}>
          {days.map(d => {
            const sums = byDate[d]?.sums ?? {};
            // 既定の順序 → マップにあるその他科目（例: 合計）も表示
            const orderedKeys = Array.from(new Set([
              ...SUBJECT_ORDER,
              ...Object.keys(sums)
            ]));
            const lines = orderedKeys
              .filter(s => (sums[s] ?? 0) > 0)
              .map(s => `${s}：${sums[s]}分`);

            return (
              <View
                key={d}
                style={{
                  width: CARD_W,
                  backgroundColor:'#fff',
                  borderWidth:1, borderColor:'#C9D3DF',
                  borderRadius:12, padding:12, marginBottom:14
                }}
              >
                <Chip text={dayjs(d).format('M月D日')} />
                <Text style={{ fontWeight:'800', marginBottom:6, textAlign:'center' }}>やったこと</Text>
                {lines.length > 0
                  ? lines.map((t, i) => <Text key={i} style={{ lineHeight:22 }}>{t}</Text>)
                  : <Text style={{ color:'#777' }}>記録なし</Text>
                }
              </View>
            );
          })}
        </View>

        {memoPick ? (
          <View
            style={{
              marginTop:6, backgroundColor:'#EAF4FF',
              borderWidth:1, borderColor:'#9FC1E6',
              borderRadius:12, padding:14
            }}
          >
            <View style={{ flexDirection:'row', alignItems:'center', marginBottom:8 }}>
              <View style={{ backgroundColor:'#3A86C1', paddingHorizontal:12, paddingVertical:6, borderRadius:10 }}>
                <Text style={{ color:'#fff', fontWeight:'900' }}>{dayjs(memoPick.date).format('M月D日')}</Text>
              </View>
              <Text style={{ marginLeft:12, color:'#2B5C86', fontWeight:'900' }}>頑張ったこと</Text>
            </View>
            <Text style={{ fontSize:16, lineHeight:24 }}>{memoPick.memo}</Text>
          </View>
        ) : null}

        <View style={{ height:24 }} />
      </ScrollView>
    </View>
  );
}