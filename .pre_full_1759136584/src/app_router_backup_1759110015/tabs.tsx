import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { TabsParamList } from './types';
import Rivals from '../screens/Rivals';
import SubmitToday from '../screens/SubmitToday';
import MyProfile from '../screens/MyProfile';
import MyWeek from '../screens/MyWeek';

const Tab = createBottomTabNavigator<TabsParamList>();

export default function Tabs(){
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown:false,
        tabBarActiveTintColor:'#1891c5',
        tabBarLabelStyle:{ fontSize:12 }
      }}
    >
      <Tab.Screen name="Rivals"  component={Rivals}     options={{ title:'ランキング' }} />
      <Tab.Screen name="Submit"  component={SubmitToday} options={{ title:'学習記録' }} />
      <Tab.Screen name="Profile" component={MyProfile}   options={{ title:'プロフィール' }} />
      <Tab.Screen name="Perks"   component={MyWeek}      options={{ title:'受験特典' }} />
    </Tab.Navigator>
  );
}
