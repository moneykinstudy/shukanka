import React from 'react';
import { View, Text, ScrollView, Image, useWindowDimensions, LayoutChangeEvent } from 'react-native';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import { getSessionUser } from '../lib/auth';

/* ★ ランクアイコンは動的 require をやめて、静的 import に変更（Expo Web で確実にバンドル） */
import RankI from '../assets/rank/I.png';
import RankII from '../assets/rank/II.png';
import RankIII from '../assets/rank/III.png';
import RankIV from '../assets/rank/IV.png';
import RankV from '../assets/rank/V.png';
import RankVI from '../assets/rank/VI.png';
import RankVII from '../assets/rank/VII.png';
import RankVIII from '../assets/rank/VIII.png';
import RankIX from '../assets/rank/IX.png';
import RankX from '../assets/rank/X.png';

/** streak→ランク（S..I） */
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

/* ★ 静的に読み込んだ画像をそのままマップに入れる（関数で包まない） */
const romanIconMap: Record<string, any> = {
  I:  RankI,
  II: RankII,
  III: RankIII,
  IV: RankIV,
  V:  RankV,
  VI: RankVI,
  VII: RankVII,
  VIII: RankVIII,
  IX: RankIX,
  X:  RankX,
};

/** 連続達成（簡易：連日） */
function calcStreakFromDates(dates: string[], todayStr?: string): number {
  const set = new Set(dates);
  const today = todayStr || dayjs().format('YYYY-MM-DD');
  let n = 0; let d = dayjs(today);
  while (set.has(d.format('YYYY-MM-DD'))) { n++; d = d.subtract(1,'day'); }
  return n;
}

export default function CalendarScreen() {
  const [daysSet, setDaysSet] = React.useState<Set<string>>(new Set());
  const [rankIcon, setRankIcon] = React.useState<any>(null);

  const now = dayjs();
  const ymTitle = now.format('YYYY年 M月');
  const daysInMonth = now.daysInMonth();
  const firstDow = now.startOf('month').day(); // 0:日〜6:土
  const totalCells = firstDow + daysInMonth;
  const rowsCount = Math.ceil(totalCells / 7); // 5 or 6

  // 画面幅に応じたスケール
  const { width } = useWindowDimensions();
  const pagePadH = 16;
  const colW = (width - pagePadH * 2) / 7;
  const dateBarPadV = Math.max(3, Math.round(colW * 0.02));
  const dateBarPadH = Math.max(4, Math.round(colW * 0.08));
  const dateBarRadius = Math.max(4, Math.round(colW * 0.12));
  const dateBarMinH = Math.max(18, Math.round(colW * 0.22));
  const dateFont = Math.max(12, Math.round(colW * 0.26));
  const iconTopGap = Math.max(4, Math.round(colW * 0.1));
  const wdayFont = Math.max(11, Math.round(colW * 0.2));
  const titleFont = Math.max(16, Math.round(colW * 0.26));

  React.useEffect(() => {
    (async () => {
      try {
        // 既存の getSessionUser() は auth 情報の可能性があるため、
        // profiles.id を確実に取得（RLS: study_logs.user_id は profiles.id）
        let profileId: string | null = null;

        // 1) まず getSessionUser() が profiles.id を返す場合はそのまま利用
        const user = await getSessionUser();
        if (user && (user as any).id) {
          // ただし中身が auth.uid のケースもあるので、profiles 窓口で検証する
          const { data: p1 } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', (user as any).id)
            .maybeSingle();
          if (p1?.id) profileId = p1.id;
        }

        // 2) 見つからない場合は auth から profiles.id を引く
        if (!profileId) {
          const { data: au } = await supabase.auth.getUser();
          const authId = au?.user?.id;
          if (!authId) return;

          const { data: p2 } = await supabase
            .from('profiles')
            .select('id')
            .eq('auth_user_id', authId)
            .maybeSingle();
          if (!p2?.id) return;
          profileId = p2.id;
        }

        // 当月範囲
        const monthStart = now.startOf('month').format('YYYY-MM-DD');
        const monthEnd   = now.endOf('month').format('YYYY-MM-DD');

        // 当月の提出日（profiles.id で絞る）
        const { data: monthLogs } = await supabase
          .from('study_logs')
          .select('study_date')
          .eq('user_id', profileId)
          .gte('study_date', monthStart)
          .lte('study_date', monthEnd);

        setDaysSet(new Set((monthLogs || []).map(r => String((r as any).study_date))));

        // 現在ランク用（直近1年）
        const since365 = now.subtract(364,'day').format('YYYY-MM-DD');
        const { data: logs365 } = await supabase
          .from('study_logs')
          .select('study_date')
          .eq('user_id', profileId)
          .gte('study_date', since365)
          .lte('study_date', now.format('YYYY-MM-DD'));

        const dates = (logs365 || []).map(r => String((r as any).study_date));
        const streak = calcStreakFromDates(dates, now.format('YYYY-MM-DD'));
        const letter = rankLabelFromStreak(streak);
        const roman = letterToRoman[letter] || 'I';

        // ★ ここも関数呼び出しをやめ、静的マップからそのまま参照
        const icon = romanIconMap[roman];
        setRankIcon(icon ?? null);
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  type Cell = { label: string; dateStr?: string; hasLog?: boolean; isBlank?: boolean };
  const rows: Cell[][] = [];
  for (let r = 0; r < rowsCount; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < 7; c++) {
      const idx = r * 7 + c;                 // 0..(rowsCount*7-1)
      const dayNum = idx - firstDow + 1;     // 1..daysInMonth が実日
      if (dayNum >= 1 && dayNum <= daysInMonth) {
        const ds = now.date(dayNum).format('YYYY-MM-DD');
        row.push({ label: String(dayNum), dateStr: ds, hasLog: daysSet.has(ds), isBlank: false });
      } else {
        row.push({ label: '', isBlank: true });
      }
    }
    rows.push(row);
  }

  const headCell = { width:'14.2857%', alignItems:'stretch', paddingVertical:8 } as const;
  const baseDayCell = {
    width:'14.2857%', aspectRatio: 0.7142857, padding:6, borderWidth:1,
    alignItems:'stretch', justifyContent:'flex-start', position:'relative'
  } as const;

  // ===== 進捗バー用の算出 =====
  const clearedCount = daysSet.size;                 // 今月提出した日数
  const maxCount = daysInMonth;                      // 今月の日数
  const clearLine = Math.floor(maxCount * 0.7);      // クリアライン
  const remainDays = Math.max(clearLine - clearedCount, 0);
  const progressRatio = Math.max(0, Math.min(1, maxCount ? clearedCount / maxCount : 0));
  const reached = clearedCount >= clearLine;
  const barColor = reached ? '#FFD54F' : '#4DA3DD';  // 70%未満:青 / 以上:黄

  // クリアライン表示用：バーの幅（px）を onLayout で取得して、線の left を計算
  const [barWidth, setBarWidth] = React.useState(0);
  const handleBarLayout = (e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width);
  const clearLeftPx = React.useMemo(() => {
    if (!barWidth || !maxCount) return 0;
    // 線がバー外にはみ出ないようにクランプ（左右 1px 余白）
    const x = Math.round(barWidth * (clearLine / maxCount));
    return Math.max(1, Math.min(barWidth - 1, x));
  }, [barWidth, clearLine, maxCount]);

  return (
    <View style={{ flex:1, backgroundColor:'#F1F6FB' }}>
      {/* ヘッダー */}
      <View style={{ height:60, backgroundColor:'#2F80B9', justifyContent:'center', alignItems:'center' }}>
        <Text style={{ color:'#fff', fontSize:21, fontWeight:'700' }}>カレンダー</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding:16 }}>
        {/* タイトル（今月） */}
        <Text style={{ fontSize: titleFont, fontWeight:'800', marginBottom:8 }}>{ymTitle}</Text>

        {/* 曜日ヘッダー */}
        <View style={{ flexDirection:'row' }}>
          {['日','月','火','水','木','金','土'].map(w=>(
            <View key={w} style={headCell}>
              <Text style={{ color:'#6B7785', fontWeight:'600', fontSize: Math.max(11, Math.round(colW * 0.2)), textAlign:'center' }}>{w}</Text>
            </View>
          ))}
        </View>

        {/* 週数は自動（5 or 6） */}
        {rows.map((cells, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection:'row' }}>
            {cells.map((c, idx) => {
              const cellStyle = {
                ...baseDayCell,
                borderColor: c.isBlank ? '#E8EBF0' : '#E1E6EC',
                backgroundColor: c.isBlank ? '#F4F6F9' : '#FFFFFF'
              } as const;

              return (
                <View key={idx} style={cellStyle}>
                  {c.label ? (
                    <View
                      style={{
                        backgroundColor:'#E9EEF3',
                        borderRadius: Math.max(4, Math.round(colW * 0.12)),
                        paddingVertical: Math.max(3, Math.round(colW * 0.02)),
                        paddingHorizontal: Math.max(4, Math.round(colW * 0.08)),
                        width:'100%',
                        minHeight: Math.max(18, Math.round(colW * 0.22)),
                        justifyContent:'center'
                      }}
                    >
                      <Text
                        style={{
                          fontWeight:'600',
                          fontSize: Math.max(12, Math.round(colW * 0.26)),
                          color:'#334155',
                          textAlign:'center',
                          includeFontPadding: false
                        }}
                      >
                        {c.label}
                      </Text>
                    </View>
                  ) : null}

                  {/* アイコンは日付バーと接しないように上に余白を入れる（空セルでは表示なし） */}
                  {!c.isBlank && c.hasLog && rankIcon ? (
                    <View style={{ flex:1, alignItems:'center', justifyContent:'center', marginTop: Math.max(4, Math.round(colW * 0.1)) }}>
                      <View style={{ width:'88%', aspectRatio:1, borderRadius:9999, overflow:'hidden', opacity:0.8 }}>
                        <Image source={rankIcon} style={{ width:'100%', height:'100%' }} resizeMode="cover" />
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}

        {/* ===== 進捗バー（カレンダーの下） ===== */}
        <View style={{ marginTop: 18 }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <Text style={{ fontWeight:'800', color:'#2B3A49' }}>今月のクリア日数</Text>

            {reached ? (
              <View style={{ backgroundColor:'#FACC15', paddingHorizontal:10, paddingVertical:4, borderRadius:9999 }}>
                <Text style={{ color:'#3A3A3A', fontWeight:'900' }}>今月のノルマ達成</Text>
              </View>
            ) : (
              <Text style={{ color:'#415264' }}>クリアまであと{Math.max(clearLine - clearedCount, 0)}日！</Text>
            )}
          </View>

          {/* バー本体（中に：進捗ゲージ + クリアライン） */}
          <View
            onLayout={handleBarLayout}
            style={{ width:'100%', height:14, backgroundColor:'#E6EDF5', borderRadius:9999, overflow:'hidden', position:'relative' }}
          >
            {/* 進捗ゲージ */}
            <View style={{ width: `${Math.round(progressRatio*100)}%`, height:'100%', backgroundColor: barColor }} />
            {/* クリアライン（縦線） */}
            {barWidth > 0 ? (
              <View
                pointerEvents="none"
                style={{
                  position:'absolute',
                  left: clearLeftPx - 1, // 線の中心がしっかり見えるよう微調整
                  top: 0,
                  width: 2,
                  height: '100%',
                  backgroundColor: '#cfcfcfff' // グレー
                }}
              />
            ) : null}
          </View>
        </View>

        <View style={{ height:24 }} />
      </ScrollView>
    </View>
  );
}
