#!/usr/bin/env bash
set -euo pipefail
FILE="src/app/index.tsx"
[ -f "$FILE" ] || { echo "not found: $FILE"; exit 1; }

TS="$(date +%Y%m%d_%H%M%S)"
cp "$FILE" "$FILE.bak.$TS"

# 1) 先頭以外の import 行を全削除（＝中腹に混入した import 群を除去）
awk '
BEGIN{seen_code=0}
{
  if (!seen_code) {
    if ($0 ~ /^import[ \t]/) { print; next }
    else { seen_code=1; print; next }
  } else {
    if ($0 ~ /^import[ \t]/) { next } else { print }
  }
}
' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"

# 2) MyWeek の import を全削除（default & named）
perl -0777 -pe 's/^\s*import\s+MyWeek\s+from\s+[\'"][^\'"]+[\'"];\s*\n//gm' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"
perl -0777 -pe 's{
  ^\s*import\s*\{([^}]*)\}\s*from\s*([\'"][^\'"]+[\'"])\s*;\s*\n
}{
  my $names=$1; my $from=$2;
  my @xs = grep { $_ !~ /^\s*MyWeek\s*$/ } map { s/^\s+|\s+$//gr } split /,/, $names;
  @xs ? "import { ".(join(", ", @xs))." } from $from;\n" : ""
}gme' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"

# 3) 先頭の import 群の直後に、正しい MyWeek import を1行だけ挿入
awk '
  BEGIN{added=0; lastImport=0}
  { lines[++N]=$0; if($0 ~ /^import[ \t]/) lastImport=N }
  END{
    for(i=1;i<=N;i++){
      print lines[i];
      if(!added && i==lastImport){
        print "import MyWeek from '"'"'../screens/MyWeek'"'"';";
        added=1
      }
    }
  }
' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"

# 4) <Stack.Screen name="MyWeek" .../> を1つだけ残す
perl -0777 -pe '
  my $n=0;
  s{<Stack\.Screen\b[^>]*\bname\s*=\s*["\x27]MyWeek["\x27][\s\S]*?\/>\s*\n?}{(++$n==1)?$&:""}gex
' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"

echo "✅ fixed: $FILE  (backup: $FILE.bak.$TS)"
