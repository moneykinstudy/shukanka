#!/usr/bin/env bash
set -e

FILE="src/screens/SignIn.tsx"

# 場所チェック
if [ ! -f "package.json" ]; then
  echo "ここは app 直下ではありません（package.json が無い）"
  exit 1
fi

# SignIn.tsx の所在
if [ ! -f "$FILE" ]; then
  CAND=$(find . -type f -name "SignIn.tsx" | head -n1 || true)
  if [ -z "$CAND" ]; then
    echo "SignIn.tsx が見つかりません"
    exit 1
  fi
  FILE="$CAND"
fi
echo "Target: $FILE"

# バックアップ
cp "$FILE" "$FILE.bak.$(date +%s)"
echo "Backup -> $FILE.bak.$(date +%s)"

# 必須 import を先頭に（無ければ追加）
grep -q "from 'react';"            "$FILE" || sed -i '' "1s|^|import React, { useState } from 'react';\n|" "$FILE"
grep -q "@react-navigation/native" "$FILE" || sed -i '' "1s|^|import { useNavigation } from '@react-navigation/native';\n|" "$FILE"
grep -q "from 'react-native'"      "$FILE" || sed -i '' "1s|^|import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';\n|" "$FILE"
grep -q "../lib/supabase"          "$FILE" || sed -i '' "1s|^|import { supabase } from '../lib/supabase';\n|" "$FILE"

# handleShortCodeLogin 実装（置換 or 追加）
/usr/bin/perl -0777 -pe '
  my $impl = q~
  async function handleShortCodeLogin() {
    try {
      const em = String(email || "").trim();
      const tok = String(code  || "").trim();
      if (!em || !tok) { Alert.alert("入力エラー","メールと6桁コードを入力してください"); return; }

      // (1) OTP 検証
      const { error: vError } = await supabase.auth.verifyOtp({ email: em, token: tok, type: "email" });
      if (vError) throw vError;

      // (2) 任意: auth と profiles の紐付け（失敗しても遷移継続）
      try {
        const { data } = await supabase.auth.getSession();
        const jwt = data?.session?.access_token;
        if (jwt) {
          const base = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
          await fetch(base + "/functions/v1/link-auth-user", {
            method: "POST",
            headers: { "Content-Type":"application/json", "Authorization":"Bearer " + jwt }
          }).catch(()=>{});
        }
      } catch {}

      // (3) Rivals へ reset 遷移
      navigation.reset({ index:0, routes:[{ name:"Tabs", params:{ screen:"Rivals" } }] });
    } catch (e) {
      console.error("[otp login] error:", e);
      Alert.alert("ログイン失敗", String(e?.message || e));
    }
  }
  ~;

  # 既存を置換、なければ挿入
  if (s/async\s+function\s+handleShortCodeLogin\s*\([^)]*\)\s*\{(?:[^{}]|\{[^{}]*\})*\}/$impl/s) {
    # 置換OK
  } else {
    if (s/(const\s+navigation\s*=\s*useNavigation[^\n]*\n)/$1$impl\n/s) {
      # navigation 直後
    } elsif (s/(export\s+default\s+function\s+SignIn\s*\([^)]*\)\s*\{)/$1\n$impl\n/s) {
      # SignIn 定義直後
    } else {
      $_ .= "\n".$impl."\n";
    }
  }
' -i '' "$FILE"

# tryLogin を安心実装で差し替え
/usr/bin/perl -0777 -pe '
  my $try = q~
  async function tryLogin() {
    const em = String(email || "").trim();
    if (!em) { setInfo("正しいメールアドレスを記入してください。"); return; }
    setSending(true);
    try {
      // 既存ユーザーのみへ送信
      const { data, error } = await supabase.from("profiles").select("id").eq("email", em).limit(1);
      if (error) throw error;
      if (!data?.length) { setInfo("新規登録からプロフィールをご登録ください。"); setAwaitCode(false); return; }
      await supabase.auth.signInWithOtp({ email: em, options:{ shouldCreateUser:false } });
      setAwaitCode(true);
      setInfo("6桁コードをメールで送信しました。入力して「コードでログイン」を押してください。");
    } catch (e) {
      Alert.alert("エラー", String(e?.message || e));
    } finally { setSending(false); }
  }
  ~;

  if (s/async\s+function\s+tryLogin\s*\([^)]*\)\s*\{(?:[^{}]|\{[^{}]*\})*\}/$try/s) {
    # 置換OK
  } else {
    $_ .= "\n".$try."\n";
  }
' -i '' "$FILE"

# 「コードでログイン」ボタンの onPress を handleShortCodeLogin に
/usr/bin/perl -0777 -pe '
  # 既に onPress があるなら置換
  if (!s/(<TouchableOpacity[^>]*\bonPress=\{)[^}]+(\}[^>]*>\s*<Text[^>]*>\s*コードでログイン\s*<\/Text>)/$1 handleShortCodeLogin $2/s) {
    # onPress が無いなら付与
    s/(<TouchableOpacity(?![^>]*\bonPress=)([^>]*))(\>)(\s*<Text[^>]*>\s*コードでログイン\s*<\/Text>)/$1 onPress={ handleShortCodeLogin }$3$4/s;
  }
' -i '' "$FILE"

# confirmWithCode があれば無効化（任意）
/usr/bin/perl -0777 -pe '
  s/async\s+function\s+confirmWithCode\s*\([^)]*\)\s*\{(?:[^{}]|\{[^{}]*\})*\}/\/\* removed: confirmWithCode \*\//gs;
' -i '' "$FILE"

echo "---- ハンドラ確認 ----"
grep -n "async function handleShortCodeLogin" "$FILE" | head -n1 || { echo "handleShortCodeLogin が見つかりません"; exit 1; }
grep -n "async function tryLogin"            "$FILE" | head -n1 || { echo "tryLogin が見つかりません"; exit 1; }
echo "---- ボタン結線確認 ----"
grep -n "onPress={[[:space:]]*handleShortCodeLogin" "$FILE" | head -n1 || { echo "ボタン結線が見つかりません"; exit 1; }

echo "✅ 反映完了。次に Metro をキャッシュクリアで再起動してください: npx expo start -c"
