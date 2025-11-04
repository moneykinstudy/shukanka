// app/src/app/index.tsx
import React, { useEffect, useState } from 'react';
import { Platform, Text, View, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

// 画面
import SignIn from '../screens/SignIn';
import ProfileRegister from '../screens/ProfileRegister';
import RankIntro from '../screens/RankIntro';
import FirstRank from '../screens/FirstRank';

// ★ OnboardOverlay をアプリ共通ルートで常時マウント
import OnboardOverlay from '../components/OnboardOverlay';

const Tab = createBottomTabNavigator();
const Stack: any = createNativeStackNavigator();

const ACTIVE = '#007cc4ff';
const INACTIVE = '#6B7785';

/** 三角＋テキスト（※三角だけ上下反転＆選択時だけ青） */
function TriangleLabel({ title, focused }: { title: string; focused: boolean }) {
  const iconColor = focused ? ACTIVE : INACTIVE;
  const labelColor = INACTIVE;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}>
      <Text
        allowFontScaling={false}
        style={{
          color: iconColor,
          fontSize: 16,
          lineHeight: 18,
          includeFontPadding: false,
          transform: [{ rotate: '180deg' }],
        }}
      >
        ▲
      </Text>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={{
          color: labelColor,
          fontSize: 12,
          lineHeight: 16,
          fontWeight: '600',
          includeFontPadding: false,
          marginTop: 2,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
    </View>
  );
}

/** 見切れ防止のカスタム TabBar */
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#FFFFFF' }}>
      <View
        style={{
          flexDirection: 'row',
          borderTopWidth: 1,
          borderTopColor: '#E5EAF0',
          minHeight: 60,
          paddingTop: 6,
          paddingBottom: Math.max(10, insets.bottom),
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const label: string =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title || route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'visible',
                paddingVertical: 4,
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              activeOpacity={0.7}
            >
              <TriangleLabel title={label} focused={isFocused} />
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function Tabs() {
  const Rivals = require('../screens/Rivals').default;
  const SubmitToday = require('../screens/SubmitToday').default;
  const Calendar = require('../screens/Calendar').default;
  const MyProfile = require('../screens/MyProfile').default;
  let PerksLink: any = null;
  try {
    PerksLink = require('../screens/PerksLink').default;
  } catch (_) {
    PerksLink = () => null;
  }

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, tabBarShowLabel: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Submit" component={SubmitToday} options={{ title: '学習記録' }} />
      <Tab.Screen name="Rivals" component={Rivals} options={{ title: 'ランキング' }} />
      <Tab.Screen name="Calendar" component={Calendar} options={{ title: 'カレンダー' }} />
      <Tab.Screen name="Profile" component={MyProfile} options={{ title: 'プロフィール' }} />
      <Tab.Screen name="Perks" component={PerksLink} options={{ title: '受験特典' }} />
    </Tab.Navigator>
  );
}

export default function AppRoot() {
  // 診断フラグ（このファイルが本当に読まれているか）
  useEffect(() => { try { (window as any).__ONBOARD_APP = 'mounted'; } catch {} }, []);

  // Web の Portal 先を必ず用意（OnboardOverlay は Portal で body 直下に描画）
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const id = 'modal-root';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
    }
  }, []);

  // ログイン検知：Rivals を前面に＆トリガを立てる
  React.useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((_evt, session) => {
      try {
        const user = session?.user;
        if (user) {
          try { localStorage.setItem('onboard:trigger_after_login', '1'); } catch {}
          const nav = require('../AppRoot').navRef ?? null;
          if (nav && nav.current) {
            nav.current.reset({
              index: 0,
              routes: [
                {
                  name: 'Tabs',
                  state: {
                    index: 0,
                    routes: [{ name: 'Rivals', params: { fromLogin: true } }],
                  },
                },
              ],
            });
          }
        }
      } catch {}
    });
    return () => { try { sub.data?.subscription?.unsubscribe(); } catch {} };
  }, []);

  const [initial, setInitial] = useState<'SignIn' | 'Tabs'>('SignIn');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setInitial(user ? 'Tabs' : 'SignIn');
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initial}>
        <Stack.Screen name="SignIn" component={SignIn} />
        <Stack.Screen name="ProfileRegister" component={ProfileRegister} />
        <Stack.Screen name="RankIntro" component={RankIntro} />
        <Stack.Screen name="FirstRank" component={FirstRank} />
        <Stack.Screen name="KnowUser" component={require('../screens/KnowUser').default} />
        <Stack.Screen name="KnowUserWeek" component={require('../screens/KnowUserWeek').default} />
        <Stack.Screen name="MyWeek" component={require('../screens/MyWeek').default} />
        <Stack.Screen name="Tabs" component={Tabs} />
      </Stack.Navigator>

      {/* NavigationContainer の “内側” に常時マウント（ナビ非依存なので落ちない） */}
      <OnboardOverlay />
    </NavigationContainer>
  );
}
