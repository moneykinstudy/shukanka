/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 共有モジュールは使わず、このファイルだけで完結させる（デプロイ・パス問題の切り分け）
const CORS = {
  'Access-Control-Allow-Origin': '*', // 開発中は * でOK。必要なら localhost:8081 に絞ってよい
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type,authorization,apikey,x-client-info',
  'Access-Control-Max-Age': '86400',
};
const withCors = (body: BodyInit, status = 200, extra: Record<string,string> = {}) =>
  new Response(body, { status, headers: { ...CORS, ...extra }});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return withCors('ok');

  try {
    // ← ここで初めて secrets を読む（トップレベル参照はしない）
    const url = (Deno.env.get('PROJECT_URL') || '').trim();
    const serviceKey = (Deno.env.get('SERVICE_ROLE_KEY') || '').trim();

    // secrets が未設定でも "必ずCORS付き" でエラー内容を返す
    if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url)) {
      return withCors(JSON.stringify({ ok:false, step:'env', error:'Invalid PROJECT_URL', got:url }), 500, {
        'content-type': 'application/json',
      });
    }
    if (!serviceKey) {
      return withCors(JSON.stringify({ ok:false, step:'env', error:'SERVICE_ROLE_KEY missing' }), 500, {
        'content-type': 'application/json',
      });
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // まずは profiles 直読みの超簡易版（ビューや集計に起因する例外を排除）
    // 必要最小限の列だけ取得（Service Role なのでRLS無視で読める）
    const { data, error } = await admin
      .from('profiles')
      .select('id, nickname, current_streak, current_rank, icon_url')
      .order('current_streak', { ascending: false })
      .limit(50);

    if (error) {
      return withCors(JSON.stringify({ ok:false, step:'select', error: error.message }), 500, {
        'content-type': 'application/json',
      });
    }

    return withCors(JSON.stringify({ ok:true, rows: data ?? [] }), 200, {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    });

  } catch (e: any) {
    // どんな例外でもCORS付きで返す（= ブラウザから中身を見られる）
    return withCors(JSON.stringify({ ok:false, step:'catch', error: String(e?.message || e) }), 500, {
      'content-type': 'application/json',
    });
  }
});
