import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator } from '@react-navigation/stack';

import Rivals from '../screens/Rivals';
import SubmitToday from '../screens/SubmitToday';
import MyProfile from '../screens/MyProfile';
import MyWeek from '../screens/MyWeek';
import KnowUser from '../screens/KnowUser';
import KnowUserWeek from '../screens/KnowUserWeek';

const Tab = createBottomTabNavigator();

// Web は createStackNavigator、ネイティブは createNativeStackNavigator
const Stack: any = Platform.OS === 'web' ? createStackNavigator() : createNativeStackNavigator();

function Tabs(){
  return (
    <Tab.Navigator screenOptions={{ headerShown:false }}>
      <Tab.Screen name="Rivals" component={Rivals} options={{ title:'ランキング' }} />
      <Tab.Screen name="Submit" component={SubmitToday} options={{ title:'学習記録' }} />
      <Tab.Screen name="Profile" component={MyProfile} options={{ title:'プロフィール' }} />
      <Tab.Screen name="Perks" component={MyWeek} options={{ title:'受験特典' }} />
      <Tab.Screen name="MyWeek" component={require('../screens/MyWeek').default} options={{ tabBarButton: () => null, title: 'あなたの今週' }} />
    </Tab.Navigator>
  );
}

export default function AppRoot(){
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown:false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="KnowUser" component={KnowUser} />
      
      <Stack.Screen name="KnowUserWeek" component={KnowUserWeek} options={{ headerShown:false }} />
  <Stack.Screen name="MyWeek" component={require('../screens/MyWeek').default} />
    </Stack.Navigator>
    </NavigationContainer>
  );
}
