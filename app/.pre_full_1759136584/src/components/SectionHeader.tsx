import React from 'react';
import { View, Text } from 'react-native';

export const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <View style={{ marginBottom: 8 }}>
    <Text style={{ fontWeight: '900', fontSize: 16, color: '#2B3A49' }}>{title}</Text>
  </View>
);
export default SectionHeader;
