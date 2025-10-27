import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { ui } from './_ui';
import { HeaderBar } from '../components/HeaderBar';
import { BadgeTitle } from '../components/BadgeTitle';
import { RivalCard, Rival } from '../components/RivalCard';

/* ★提出完了イベント */
import { appEvents, AppEvent } from '../lib/appEvents';

/* ★ 追加：ログイン直後に A2HS/通知案内を出すオーバーレイ */
import { OnboardOverlay } from '../components/OnboardOverlay';

/** functions base 推定 */
let _functionsBase: (() => string) | null = null;
try {
  // @ts-ignore
  const mod = require('../utils/functionsBase');
  if (mod && typeof mod.functionsBase === 'function') _functionsBase = mod.functionsBase;
} catch {}
function functionsBase(): string {
  if (_functionsBase) return _functionsBase();
  try {
    const url =
      (globalThis as any)?.supabase?.url ||
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      '';
    const m = url.match(/^https:\/\/([a-z0-9]{20})\.supabase\.co/i);
    return m ? `https://${m[1]}.functions.supabase.co` : 'FALLBACK_REF';
  } catch {
    return 'FALLBACK_REF';
  }
}

import { supabase } from '../lib/supabase';

type Item = {
  user_id?: string; id?: string;
  nickname?: string; nick_name?: string; user_nickname?: string; user_name?: string; display_name?: string; full_name?: string; name?: string;
  grade?: string; user_grade?: string; grade_label?: string; school_year?: string; class_year?: string; rank_grade?: string; g?: string;
  current_rank?: string; rank?: string;
  streak_days?: number; streak?: number; streak_count?: number;
  avatar_url?: string | null;
  category?: string; is_rising?: boolean;
  recent_gain?: number; gain?: number; delta?: number;
  updated_at?: string;
};
function normId(it: Item): string { return String(it.user_id ?? it.id ?? ''); }
function normStreak(it: Item): number { return Number(it.streak_days ?? it.streak ?? it.streak_count ?? 0); }
function normNickname(it: Item): string {
  const s = it.nickname ?? it.user_nickname ?? it.nick_name ?? it.user_name ?? it.display_name ?? it.full_name ?? it.name ?? '';
  const v = String(s).trim(); return v || '名無し';
}
function normGrade(it: Item): string {
  const s = it.grade ?? it.user_grade ?? it.grade_label ?? it.school_year ?? it.class_year ?? it.rank_grade ?? it.g ?? '';
  return String(s).trim();
}
function normRank(it: Item): string {
  const v = (it.current_rank ?? it.rank ?? '').toString().trim();
  return v || 'I';
}
function parseRankingPayload(json: any) {
  const tops = (json?.top_rankers ?? json?.tops ?? []) as Item[];
  const rises = (json?.rising_rankers ?? json?.rises ?? []) as Item[];
  return { tops, rises };
}
function toRival(it: Item): Rival {
  const rnk = normRank(it) || 'I';
  const rankAliases = { rank: rnk, currentRank: rnk, current_rank: rnk, rankText: rnk, rank_label: rnk, rankLabel: rnk, tier: rnk, tier_label: rnk };
  return { id: normId(it), nickname: normNickname(it), grade: normGrade(it), streakDays: normStreak(it), avatarUrl: it.avatar_url || undefined, ...(rankAliases as any) } as any as Rival;
}

/** View → Fallback の順で取得 */
async function loadFromView(): Promise<{ tops: Item[]; rises: Item[] }> {
  const { data, error } = await supabase.from('v_rivals_streak_ranking').select('*').limit(100);
  if (error) { console.warn('[Rivals] view fetch error:', error); return { tops: [], rises: [] }; }
  const rows = (data || []) as Item[];
  if (rows.length === 0) return { tops: [], rises: [] };

  const hasCategory = rows.some(r => typeof r.category !== 'undefined');
  const hasIsRising = rows.some(r => typeof r.is_rising !== 'undefined');

  let tops: Item[] = [];
  let rises: Item[] = [];

  if (hasCategory) {
    tops = rows.filter(r => String(r.category).toLowerCase().includes('top'));
    rises = rows.filter(r => String(r.category).toLowerCase().includes('rise'));
  } else if (hasIsRising) {
    rises = rows.filter(r => !!r.is_rising);
    tops  = rows.filter(r => !r.is_rising);
  } else {
    const withGain = rows.some(r => typeof (r.recent_gain ?? r.gain ?? r.delta) !== 'undefined');
    if (withGain) {
      tops = [...rows].sort((a,b)=> normStreak(b) - normStreak(a)).slice(0, 12);
      rises = [...rows]
        .sort((a,b)=> Number((b.recent_gain ?? b.gain ?? b.delta) || 0) - Number((a.recent_gain ?? a.gain ?? a.delta) || 0))
        .slice(0, 12);
    } else {
      tops = [...rows].sort((a,b)=> normStreak(b) - normStreak(a)).slice(0, 12);
      rises = [...rows]
        .filter(r => normStreak(r) > 0)
        .sort((a,b)=> {
          const at = (x: Item)=> (x.updated_at ? Date.parse(x.updated_at) : 0);
          return at(b) - at(a);
        })
        .slice(0, 12);
    }
  }

  const rankOrStreakSort = (_a: Item, _b: Item) => 0;
  tops = tops.sort(rankOrStreakSort).slice(0, 12);

  const gainVal = (x: Item) => Number((x.recent_gain ?? x.gain ?? x.delta) || 0);
  const hasAnyGain = rises.some(r => gainVal(r) !== 0);
  rises = rises
    .sort((a,b)=> hasAnyGain ? gainVal(b) - gainVal(a) : normStreak(b) - normStreak(a))
    .slice(0, 12);

  return { tops, rises };
}
async function fallbackFetchProfiles(): Promise<{ tops: Item[]; rises: Item[] }> {
  const { data: topRows } = await supabase
    .from('profiles')
    .select('id, nickname, full_name, grade, streak_days, current_rank, avatar_url')
    .order('streak_days', { ascending: false })
    .limit(12);

  const { data: riseRows } = await supabase
    .from('profiles')
    .select('id, nickname, full_name, grade, streak_days, current_rank, avatar_url, updated_at')
    .gt('streak_days', 0)
    .order('updated_at', { ascending: false })
    .limit(12);

  const tops: Item[] = (topRows || []).map(r => ({
    user_id: (r as any).id,
    nickname: (r as any).nickname,
    full_name: (r as any).full_name,
    grade: (r as any).grade,
    streak_days: (r as any).streak_days,
    current_rank: (r as any).current_rank,
    avatar_url: (r as any).avatar_url
  }));
  const rises: Item[] = (riseRows || []).map(r => ({
    user_id: (r as any).id,
    nickname: (r as any).nickname,
    full_name: (r as any).full_name,
    grade: (r as any).grade,
    streak_days: (r as any).streak_days,
    current_rank: (r as any).current_rank,
    avatar_url: (r as any).avatar_url,
    updated_at: (r as any).updated_at
  }));

  return { tops, rises };
}

export default function Rivals() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tops, setTops] = useState<Rival[]>([]);
  const [rises, setRises] = useState<Rival[]>([]);

  // ★ SignIn 側からの保険パラメータ（fromLogin）を受けて、確実にトリガを立てる
  useEffect(() => {
    try {
      if (route?.params?.fromLogin && typeof window !== 'undefined') {
        window.localStorage.setItem('onboard:trigger_after_login', '1');
        console.debug('[Rivals] fromLogin param detected -> trigger set');
      }
    } catch {}
  }, [route?.params]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const base = functionsBase();
      const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

      // 1) Edge Function
      if (base && base !== 'FALLBACK_REF') {
        try {
          const res = await fetch(`${base}/get-ranking`, {
            headers: {
              'Content-Type': 'application/json',
              ...(anon ? { apikey: anon, Authorization: `Bearer ${anon}` } : {}),
            },
          });
          const text = await res.text();
          if (res.ok) {
            try {
              const json = JSON.parse(text || '{}');
              const { tops, rises } = parseRankingPayload(json);
              if ((tops?.length ?? 0) > 0 || (rises?.length ?? 0) > 0) {
                setTops((tops || []).map(toRival));
                setRises((rises || []).map(toRival));
                setLoading(false);
                return;
              }
            } catch {}
          } else {
            setErr(`ランキングAPIエラー: HTTP ${res.status}`);
          }
        } catch (e: any) {
          setErr('ランキングAPIに接続できませんでした（ビューへフォールバック）');
        }
      }

      // 2) ビュー
      const viewRes = await loadFromView();
      if ((viewRes.tops.length + viewRes.rises.length) > 0) {
        setTops(viewRes.tops.map(toRival));
        setRises(viewRes.rises.map(toRival));
        setLoading(false);
        return;
      }

      // 3) 最終フォールバック：profiles
      const fb = await fallbackFetchProfiles();
      setTops((fb.tops || []).map(toRival));
      setRises((fb.rises || []).map(toRival));
    } catch (e: any) {
      setErr(String(e?.message || e));
      setTops([]);
      setRises([]);
    } finally {
      setLoading(false);
    }
  }

  // 画面入場時＋フォーカス時に再取得
  useEffect(() => { load(); }, []);
  useFocusEffect(React.useCallback(() => { load(); }, []));

  // 提出完了イベントで再取得
  useEffect(() => {
    const maybeOff = appEvents.on(AppEvent.StudySubmitted, () => { load(); });
    return () => { try { if (typeof maybeOff === 'function') maybeOff(); } catch {} };
  }, []);

  const renderGrid = (list: Rival[]) => {
    if (loading && list.length === 0) {
      return (
        <View style={{ paddingVertical: 12 }}>
          <ActivityIndicator />
        </View>
      );
    }
    if (list.length === 0) {
      return <Text style={{ color: '#666', marginVertical: 8, textAlign: 'center' }}>データがありません</Text>;
    }
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {list.map((r) => (
          <View key={r.id} style={{ width: '48%', marginBottom: 12 }}>
            <RivalCard
              rival={r}
              onPress={() => navigation.navigate('KnowUser', {
                user_id: r.id, nickname: r.nickname, grade: r.grade,
                streakPrefetch: r.streakDays
              })}
            />
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[ui.page, { backgroundColor: '#F3F7FB' }]}>
      <HeaderBar title="ライバルの連続達成" />
      <ScrollView style={[ui.body, { paddingTop: 8 }]}>
        {err ? <Text style={{ color: 'crimson', marginBottom: 8 }}>エラー: {err}</Text> : null}
        <BadgeTitle>上位ランカー</BadgeTitle>
        {renderGrid(tops)}
        <BadgeTitle>急上昇ランカー</BadgeTitle>
        {renderGrid(rises)}
        <View style={{ height: 18 }} />
      </ScrollView>

      {/* ★ ログイン直後フラグやPWA再起動フラグを検出し、必要なら A2HS/通知案内をオーバーレイ表示 */}
      <OnboardOverlay />
    </View>
  );
}
