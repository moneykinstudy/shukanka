import re, os, glob, shutil, time, io
mp = 'src/screens/MyProfile.tsx'
if not os.path.isfile(mp):
    cands = []
    for f in glob.glob('src/screens/*.tsx'):
        try:
            t = io.open(f, 'r', encoding='utf-8', errors='ignore').read()
        except Exception:
            continue
        if ('もっと' in t) or ('プロフィール' in t) or ('MyProfile' in f):
            cands.append((f, t.count('もっと')))
    if not cands:
        print('❌ MyProfile.tsx が見つかりません。'); raise SystemExit(1)
    mp = max(cands, key=lambda x:x[1])[0]

print('MyProfile:', mp)
src = io.open(mp, 'r', encoding='utf-8').read()
ts = time.strftime('%Y%m%d_%H%M%S')
shutil.copyfile(mp, f'{mp}.bak.{ts}')

orig = src
if '@react-navigation/native' not in src:
    src = re.sub(r'(^import[^\n]*\n(?:import[^\n]*\n)*)',
                 r'\1import { useNavigation } from "@react-navigation/native";\n',
                 src, count=1, flags=re.M)
elif 'useNavigation' not in src:
    src = re.sub(
        r'import\s*\{([^}]*)\}\s*from\s*[\'"]@react-navigation/native[\'"];',
        lambda m: f'import {{{m.group(1).strip()}, useNavigation}} from "@react-navigation/native";',
        src
    )
if 'useNavigation<any>()' not in src and 'useNavigation()' not in src:
    new_src = re.sub(
        r'(export\s+default\s+function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{)',
        r'\1\n  const navigation = useNavigation<any>();',
        src, count=1
    )
    if new_src == src:
        new_src = re.sub(
            r'(function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{)',
            r'\1\n  const navigation = useNavigation<any>();',
            src, count=1
        )
    src = new_src
pattern_touch = re.compile(
    r'(<TouchableOpacity\b(?![^>]*onPress=)[^>]*>)'
    r'([\s\S]*?)'
    r'(もっと\s*見る)'
    r'([\s\S]*?)'
    r'(</TouchableOpacity>)',
    re.S
)
def add_onpress_to_touch(m):
    tag, before, label, after, close = m.groups()
    tag = re.sub(r'>$', r' onPress={() => navigation.navigate("MyWeek")}>', tag)
    return f'{tag}{before}{label}{after}{close}'

src = pattern_touch.sub(add_onpress_to_touch, src)

pattern_btn = re.compile(
    r'(<Button\b(?![^>]*onPress=)([^>]*?)\btitle\s*=\s*["\']もっと\s*見る["\'][^>]*)(>)',
    re.S
)
src = pattern_btn.sub(r'\1 onPress={() => navigation.navigate("MyWeek")}\3', src)
if src != orig:
    io.open(mp, 'w', encoding='utf-8').write(src)
    print('✔ もっと見る → MyWeek 遷移を設定しました')
else:
    print('ℹ 変更不要か、文言/構造が異なり自動検出できませんでした。')
