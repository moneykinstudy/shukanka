import React from 'react';
import { View, ViewProps } from 'react-native';

export type CardProps = ViewProps & { children?: React.ReactNode };

export const Card: React.FC<CardProps> = ({ style, children, ...rest }) => (
  <View
    style={[
      {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D9E1EA',
        padding: 12,
      },
      style,
    ]}
    {...rest}
  >
    {children}
  </View>
);
export default Card;
