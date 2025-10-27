import React from 'react';
import { View, Text } from 'react-native';

export type RankRowProps = {
  rank: number;
  name: string;
  minutes: number;
  isMe?: boolean;
};

export const RankRow: React.FC<RankRowProps> = ({ rank, name, minutes, isMe }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#EEF2F6',
    }}
  >
    <Text style={{ width: 32, fontWeight: '900', color: '#2B3A49' }}>{rank}</Text>
    <View style={{ flex: 1 }}>
      <Text style={{ fontWeight: isMe ? '900' as const : '600' as const, color: '#2B3A49' }}>
        {name}{isMe ? '（自分）' : ''}
      </Text>
    </View>
    <Text style={{ width: 72, textAlign: 'right', color: '#2B3A49' }}>{minutes}分</Text>
  </View>
);
export default RankRow;
