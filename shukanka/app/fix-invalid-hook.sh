#!/usr/bin/env bash
set -euo pipefail

FILE="src/screens/SignIn.tsx"
[ -f "$FILE" ] || { echo "❌ $FILE が見つかりません"; exit 1; }

# バックアップ
cp "$FILE" "$FILE.bak.$(date +%s)"
echo "🗂 Backup -> $FILE.bak.$(date +%s)"

# --- 診断: handleShortCodeLogin 範囲で useNavigation() を使ってないか ---
echo "---- 検索: handleShortCodeLogin 範囲の useNavigation 呼び出し ----"
START_LINE=$(grep -n "async[[:space:]]\+function[[:space:]]\+handleShortCodeLogin" "$FILE" | head -n1 | cut -d: -f1 || true)
if [ -z "${START_LINE:-}" ]; then
  echo "❌ handleShortCodeLogin 定義が見つかりません。処理を中断します。"
  exit 1
fi

# 関数終端をざっくり探索（次の行から最初に現れる単独の閉じ波括弧を終端候補に）
END_LINE=$(awk "NR>=$START_LINE{print NR \":\" \$0}" "$FILE" | awk -F: '
  NR==1 {depth=0}
  {
    line=$0; sub(/^[0-9]+:/,"",line)
    # 文字列・コメントの厳密対応は省略。波括弧の深さでおおまかに判定。
    ob=gsub(/{/,"{",line); cb=gsub(/}/,"}",line);
    if (NR==1) depth=1+ob-cb; else depth+=ob-cb;
    if (depth<=0) { print NR; exit }
  }' || true)

if [ -z "${END_LINE:-}" ]; then
  # フォールバック: 先頭から200行先ぐらいまで
  END_LINE=$((START_LINE+200))
fi

echo "handleShortCodeLogin: 行 $START_LINE 〜 $((START_LINE+END_LINE)) (概算)"

# 範囲抽出して useNavigation の有無を確認
RANGE_HAS_HOOK=$(sed -n "${START_LINE},$((START_LINE+END_LINE))p" "$FILE" | grep -c "useNavigation(" || true)
echo "useNavigation() calls in range: $RANGE_HAS_HOOK"

# --- 修正: handleShortCodeLogin 内の useNavigation() を navigation に置き換え ---
# ついでに require('@react-navigation/native').useNavigation の形も削除
/usr/bin/perl -0777 -pe '
  my $s = $_;
  if ($s =~ /async\s+function\s+handleShortCodeLogin\s*\([^)]*\)\s*\{/) {
    $s =~ s/(async\s+function\s+handleShortCodeLogin\s*\([^)]*\)\s*\{)(.*?)(\n\})/my $head=$1; my $body=$2; my $tail=$3;
      # body 内修正:
      # 1) require("@react-navigation/native") からの useNavigation 取得行を削除
      $body =~ s/^\s*const\s*\{\s*useNavigation\s*\}\s*=\s*require\([\'"]@react-navigation\/native[\'"]\);\s*\n//mg;
      # 2) const nav = useNavigation(); を const nav = navigation; に
      $body =~ s/const\s+nav\s*=\s*useNavigation\s*\(\s*\)\s*;/const nav = navigation;/g;
      # 3) 残ってしまった useNavigation() を navigation に（極力この関数内のみ）
      $body =~ s/\buseNavigation\s*\(\s*\)/navigation/g;

      $head.$body.$tail/egs;

    $_ = $s;
  }
' -i '' "$FILE"

echo "---- 再診断（修正後）----"
sed -n "${START_LINE},$((START_LINE+END_LINE))p" "$FILE" | nl -ba | sed -n '1,120p' | sed -n '/useNavigation(/p' || true

echo "✅ 修正完了。次に、最新の 6 桁コードでログインを再試行してください。"
