import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Tabs from './appnav/Tabs';
import Splash from './screens/Splash';
import Login from './screens/Login';
import FirstLogin from './screens/FirstLogin';

const Stack = createNativeStackNavigator();
export const navRef: any = React.createRef();

export default function AppRoot(){
  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator screenOptions={{ headerShown:false }}>
        <Stack.Screen name="Splash" component={Splash} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="FirstLogin" component={FirstLogin} />
        <Stack.Screen name="Tabs" component={Tabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
