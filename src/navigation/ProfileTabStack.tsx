import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator } from '@react-navigation/stack';
import MyProfile from '../screens/MyProfile';
import MyWeek from '../screens/MyWeek';
import KnowUser from '../screens/KnowUser';
import KnowUserWeek from '../screens/KnowUserWeek';
const Stack: any = Platform.OS === 'web' ? createStackNavigator() : createNativeStackNavigator();
export default function ProfileTabStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyProfile" component={MyProfile} />
      <Stack.Screen name="MyWeek" component={MyWeek} />
      <Stack.Screen name="KnowUser" component={KnowUser} />
      <Stack.Screen name="KnowUserWeek" component={KnowUserWeek} />
    </Stack.Navigator>
  );
}
