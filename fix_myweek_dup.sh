#!/usr/bin/env bash
set -euo pipefail
FILE="src/app/index.tsx"
[ -f "$FILE" ] || { echo "not found: $FILE"; exit 1; }

TS="$(date +%Y%m%d_%H%M%S)"
cp "$FILE" "$FILE.bak.$TS"

# 1) MyWeek の import を全削除（default import）
perl -0777 -pe 's{^\s*import\s+MyWeek\s+from\s+[\'"][^\'"]+[\'"];\s*\n}{}gm' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"

# 2) named import に MyWeek が混ざっている場合は MyWeek だけ除去（他の名前は残す）
perl -0777 -pe 's{
  ^\s*import\s*\{([^}]*)\}\s*from\s*([\'"][^\'"]+[\'"])\s*;\s*\n
}{
  my $names=$1; my $from=$2;
  my @xs = grep { $_ !~ /^\s*MyWeek\s*$/ } map { s/^\s+|\s+$//gr } split /,/, $names;
  @xs ? "import { ".(join(", ", @xs))." } from $from;\n" : ""
}gme' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"

# 3) import 群の直後に、正しい1行だけ挿入
awk '
  BEGIN{added=0; last=0}
  { lines[++N]=$0; if($0 ~ /^import[ \t]/) last=N }
  END{
    for(i=1;i<=N;i++){
      print lines[i];
      if(!added && i==last){
        print "import MyWeek from '"'"'../screens/MyWeek'"'"';";
        added=1
      }
    }
  }
' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"

# 4) <Stack.Screen name="MyWeek" ... /> を1つだけ残す
perl -0777 -pe '
  my $n=0;
  s{<Stack\.Screen\b[^>]*\bname\s*=\s*["\x27]MyWeek["\x27][\s\S]*?\/>\s*\n?}{(++$n==1)?$&:""}gex
' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"

# 5) もし関数/変数定義で MyWeek が重複してたら検出
echo "---- scan possible local declarations ----"
grep -nE '^\s*(const|function)\s+MyWeek\b' "$FILE" || true
echo "-----------------------------------------"

echo "✅ fixed. backup: $FILE.bak.$TS"
