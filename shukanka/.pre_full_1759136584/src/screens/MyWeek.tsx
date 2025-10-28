import React from 'react'; import { View, Text } from 'react-native'; import { ui } from './_ui';
export default function MyWeek(){ return <View style={ui.page}><View style={ui.header}><Text style={ui.hTitle}>あなたの今週</Text></View><View style={ui.body}><Text>（後でAPI接続）</Text></View></View>; }
