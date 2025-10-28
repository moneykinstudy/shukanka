import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Rivals from '../screens/Rivals';
import SubmitToday from '../screens/SubmitToday';
import MyProfile from '../screens/MyProfile';
import MyWeek from '../screens/MyWeek';

const Tab = createBottomTabNavigator();
export default function Tabs(){
  return (
    <Tab.Navigator screenOptions={{ headerShown:false }}>
      <Tab.Screen name="Rivals" component={Rivals} options={{ title:'ランキング' }} />
      <Tab.Screen name="Submit" component={SubmitToday} options={{ title:'提出' }} />
      <Tab.Screen name="Profile" component={MyProfile} options={{ title:'プロフィール' }} />
      <Tab.Screen name="Perks" component={MyWeek} options={{ title:'今週' }} />
    </Tab.Navigator>
  );
}
