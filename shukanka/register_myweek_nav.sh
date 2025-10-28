#!/usr/bin/env bash
set -euo pipefail

TS="$(date +%Y%m%d_%H%M%S)"

# 1) Stack.Navigator を含むナビファイル自動検出
NAV_FILE=""
for p in \
  "src/navigation/AppNavigator.tsx" \
  "src/navigation/AppNavigator.ts" \
  "src/App.tsx" \
  "src/App.ts" \
  "App.tsx" \
  "App.ts" \
  "src/navigation/index.tsx" \
  "src/navigation/index.ts"
do
  if [ -f "$p" ] && grep -q "Stack\.Navigator" "$p"; then NAV_FILE="$p"; break; fi
done
if [ -z "${NAV_FILE}" ]; then
  NAV_FILE="$(grep -RIl --include='*.ts*' 'Stack\.Navigator' src 2>/dev/null | head -n1 || true)"
fi
if [ -z "${NAV_FILE}" ]; then
  echo "❌ Stack.Navigator を含むファイルが見つかりません。"; exit 1
fi
echo "navigator: ${NAV_FILE}"

# 2) MyWeek の import 追加（相対パス自動判定）
DIR_OF_NAV="$(dirname "$NAV_FILE")"
if [ -d "$DIR_OF_NAV/screens" ]; then
  REL_IMPORT="./screens/MyWeek"
elif [ -d "src/screens" ] && [ "$DIR_OF_NAV" = "src/navigation" ]; then
  REL_IMPORT="../screens/MyWeek"
elif [ -d "src/screens" ] && [ "$DIR_OF_NAV" = "src" ]; then
  REL_IMPORT="./screens/MyWeek"
else
  REL_IMPORT="./src/screens/MyWeek"
fi

cp "$NAV_FILE" "$NAV_FILE.bak.$TS"

if ! grep -qE "import\s+MyWeek\s+from\s+['\"]$REL_IMPORT['\"]" "$NAV_FILE"; then
  awk -v imp="import MyWeek from '$REL_IMPORT';" '
    BEGIN{done=0}
    /^import / {print; last=NR; next}
    {
      if(!done){
        if(last){ print imp; done=1 }
        print
      } else {
        print
      }
    }
  ' "$NAV_FILE" > "$NAV_FILE.tmp" && mv "$NAV_FILE.tmp" "$NAV_FILE"
  echo "import added: $REL_IMPORT"
else
  echo "import already present"
fi

# 3) <Stack.Screen name="MyWeek"...> を</Stack.Navigator> の直前へ
if ! grep -q 'name="MyWeek"' "$NAV_FILE"; then
  perl -0777 -pe '
    s{</Stack\.Navigator>}{
      qq{  <Stack.Screen name="MyWeek" component={MyWeek} options={{ title: "あなたの今週", headerShown: false }} />\n</Stack.Navigator>}
    }e;
  ' "$NAV_FILE" > "$NAV_FILE.tmp" && mv "$NAV_FILE.tmp" "$NAV_FILE"
  echo "Stack.Screen inserted"
else
  echo "Stack.Screen already present"
fi

# 4) MyProfile の「もっと見る」→ MyWeek 遷移
MP="src/screens/MyProfile.tsx"
if [ ! -f "$MP" ]; then
  MP="$(grep -RIl --include='*.tsx' 'もっと見る|MyProfile' src 2>/dev/null | head -n1 || true)"
fi
[ -n "$MP" ] || { echo "❌ MyProfile.tsx が見つかりません。"; exit 1; }
cp "$MP" "$MP.bak.$TS"
echo "myprofile: $MP"

# 4-1) useNavigation import
if ! grep -q "from '@react-navigation/native'" "$MP"; then
  perl -0777 -pe 's{(^import[^\n]*\n(?:import[^\n]*\n)*)}{$1import { useNavigation } from "@react-navigation/native";\n}m' "$MP" > "$MP.tmp" && mv "$MP.tmp" "$MP"
elif ! grep -q "useNavigation" "$MP"; then
  perl -0777 -pe 's{import\s*\{\s*([^}]*)\}\s*from\s*[\"\']@react-navigation/native[\"\'];}{
    my $g=$1; $g=~s/^\s+|\s+$//g; my %h=map{$_=>1} split(/\s*,\s*/,$g);
    $h{"useNavigation"}? "import { $g } from \"@react-navigation/native\";" : "import { $g, useNavigation } from \"@react-navigation/native\";";
  }e' "$MP" > "$MP.tmp" && mv "$MP.tmp" "$MP"
fi

# 4-2) コンポーネント先頭に navigation フック（未設定なら）
if ! grep -q "useNavigation<" "$MP" && ! grep -q "useNavigation()" "$MP"; then
  perl -0777 -pe '
    s{(function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{|\bexport\s+default\s+function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{)}{
      "$1\n  const navigation = useNavigation<any>();"
    }e
  ' "$MP" > "$MP.tmp" && mv "$MP.tmp" "$MP" || true
fi

# 4-3) 「もっと見る」ボタン/タッチ領域に onPress を付与（未設定のときのみ）
perl -0777 -pe '
  s{
    (<TouchableOpacity\b(?![^>]*onPress=)[^>]*>)       # 開始タグ（onPress未設定）
    (\s* (?:<(?!/TouchableOpacity)[\s\S])*? )           # 内容
    (もっと見る)                                        # テキスト
  }{
    my ($tag,$mid,$txt)=($1,$2,$3);
    $tag=~s{>$}{ onPress={() => navigation.navigate("MyWeek")}>};
    "$tag$mid$txt"
  }gex;
' "$MP" > "$MP.tmp" && mv "$MP.tmp" "$MP"

perl -0777 -pe '
  s{
    (<Button\b(?![^>]*onPress=)([^>]*?)\btitle\s*=\s*["\x27]もっと見る["\x27][^>]*)
    (>)
  }{$1 onPress={() => navigation.navigate("MyWeek")} $3}gex;
' "$MP" > "$MP.tmp" && mv "$MP.tmp" "$MP"

# 5) 仕上げ（型）
if grep -q "useNavigation<any>" "$MP"; then :; else
  perl -0777 -pe 's{useNavigation\(\)}{useNavigation<any>()}g' "$MP" > "$MP.tmp" && mv "$MP.tmp" "$MP" || true
fi

echo "✅ Done. Try: npx expo start --clear"
