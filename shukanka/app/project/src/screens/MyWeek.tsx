import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import { getSessionUser } from '../lib/auth';

type Row = {
  study_date: string;     // 'YYYY-MM-DD'
  subject?: string | null;
  minutes?: number | null;
  memo?: string | null;
};

// 表示順（完成系準拠）
const SUBJECT_ORDER: string[] = ['数学','英語','国語','理科','社会','情報','宿題','その他'];

/**
 * 「ニックネームさんの今週」と同じ方針：
 * - メモ内の「内訳」見出しの位置から末尾まで丸ごとカット（本文＝freeNote）
 * - メモ全体から「教科：NN分」を抽出し sums に加算（本文には混ぜない）
 */
function parseMemoToSums(memo: string | null | undefined) {
  const sums: Record<string, number> = {};
  if (!memo) return { sums, freeNote: '' };

  const subjGroup = SUBJECT_ORDER.join('|');
  const reAll = new RegExp(`(?:^|[^一-龥A-Za-z0-9_])(${subjGroup})\\s*[：:]\\s*(\\d{1,4})\\s*分`, 'g');

  let m: RegExpExecArray | null;
  while ((m = reAll.exec(memo)) !== null) {
    const subj = m[1];
    const min = Number(m[2] || 0);
    if (min > 0) sums[subj] = (sums[subj] ?? 0) + min;
  }

  // 「内訳」見出しの位置から末尾まで本文から除去
  const cutIdx = memo.search(/(^|\n)\s*内訳\s*[：:]/);
  const freeSrc = cutIdx >= 0 ? memo.slice(0, cutIdx) : memo;

  const free = freeSrc
    .split(/\r?\n/)
    .map(line => line.replace(/\s+$/,''))
    .join('\n')
    .trim();

  return { sums, freeNote: free };
}

/** 小さな日付チップ（完成系踏襲） */
const Chip = ({ text }: { text: string }) => (
  <View style={{ alignSelf:'flex-start', backgroundColor:'#D1D8DF',
                 borderRadius:8, paddingHorizontal:10, paddingVertical:4, marginBottom:8 }}>
    <Text style={{ color:'#2B3A49', fontWeight:'800' }}>{text}</Text>
  </View>
);

type ByDate = Record<string, { sums: Record<string, number>, memo?: string }>;

export default function MyWeek() {
  // 昨日まで7日（古い→新しい）
  const days = useMemo(() => {
    const arr: string[] = [];
    for (let i = 7; i >= 1; i--) arr.push(dayjs().subtract(i, 'day').format('YYYY-MM-DD'));
    return arr;
  }, []);

  const [loading, setLoading] = useState(false);
  const [byDate, setByDate] = useState<ByDate>({});
  const [memoPick, setMemoPick] = useState<{ date: string, memo: string } | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      setLoading(true);
      try {
        const me = await getSessionUser();
        if (!me) { if (isMounted) { setByDate({}); setMemoPick(null); } return; }

        const from = days[0];
        const to   = days[days.length - 1];

        const { data, error } = await supabase
          .from('study_logs')
          .select('study_date, subject, minutes, memo')
          .eq('user_id', me.id)
          .gte('study_date', from)
          .lte('study_date', to);

        if (error) {
          console.error('[MyWeek] logs error', error);
          if (isMounted) { setByDate({}); setMemoPick(null); }
          return;
        }

        // 初期マップ
        const map: ByDate = {};
        for (const d of days) map[d] = { sums: {}, memo: undefined };

        // 集計（subject/minutes を合算 + memo からも抽出、freeNote は「内訳」以降を除外）
        (data as Row[]).forEach(r => {
          const d = String(r.study_date);
          if (!(d in map)) return;

          if (r.subject && (r.minutes ?? 0) > 0) {
            const subj = String(r.subject);
            const min  = Number(r.minutes ?? 0);
            if (min > 0) map[d].sums[subj] = (map[d].sums[subj] ?? 0) + min;
          }

          const { sums, freeNote } = parseMemoToSums(r.memo);
          for (const subj of Object.keys(sums)) {
            map[d].sums[subj] = (map[d].sums[subj] ?? 0) + sums[subj];
          }

          if (freeNote) {
            // 常に freeNote を採用（長さ比較はしない）
            map[d].memo = freeNote;
          }
        });

        if (!isMounted) return;
        setByDate(map);

        // freeNote がある日のみを候補にし、ランダムで1件
        const candidates = days
          .map(d => ({ date: d, memo: map[d]?.memo }))
          .filter(x => x.memo && String(x.memo).trim().length > 0) as { date: string, memo: string }[];

        if (candidates.length > 0) {
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          setMemoPick(pick);
        } else {
          setMemoPick(null);
        }
      } catch (e) {
        console.error('[MyWeek] unexpected', e);
        if (isMounted) { setByDate({}); setMemoPick(null); }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [days]);

  return (
    <View style={{ flex:1, backgroundColor:'#F3F7FB' }}>
      {/* ヘッダー */}
      <View style={{ height:56, alignItems:'center', justifyContent:'center', backgroundColor:'#2F80B9' }}>
        <Text style={{ color:'#fff', fontWeight:'900', fontSize:18 }}>あなたの今週</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding:16 }}>
        {loading ? (
          <View style={{ paddingTop:24, alignItems:'center' }}>
            <ActivityIndicator />
            <Text style={{ marginTop:8, color:'#666' }}>読み込み中…</Text>
          </View>
        ) : null}

        {/* 上段：7日分カード */}
        <View style={{ flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between' }}>
          {days.map(d => {
            const sums = byDate[d]?.sums ?? {};
            const lines = SUBJECT_ORDER.filter(s => (sums[s] ?? 0) > 0).map(s => `${s}：${sums[s]}分`);
            return (
              <View key={d}
                    style={{ width:'48%', backgroundColor:'#fff', borderWidth:1, borderColor:'#C9D3DF',
                             borderRadius:12, padding:12, marginBottom:14 }}>
                <Chip text={dayjs(d).format('M月D日')} />
                <Text style={{ fontWeight:'800', marginBottom:6, textAlign:'center' }}>やったこと</Text>
                {lines.length>0 ? lines.map((t,i)=><Text key={i} style={{ lineHeight:22 }}>{t}</Text>)
                                : <Text style={{ color:'#777' }}>記録なし</Text>}
              </View>
            );
          })}
        </View>

        {/* 下段：ランダム1日の「頑張ったこと」（本文のみ表示。内訳は表示しない） */}
        {memoPick ? (
          <View style={{ marginTop:6, backgroundColor:'#EAF4FF', borderWidth:1,
                         borderColor:'#9FC1E6', borderRadius:12, padding:14 }}>
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
