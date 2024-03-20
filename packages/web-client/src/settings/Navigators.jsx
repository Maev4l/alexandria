import { createStackNavigator } from '@react-navigation/stack';

import SettingsScreen from './SettingsScreen';
import About from './About';
import Account from './Account';
import ChangePassword from './ChangePassword';
import Appearance from './Appearance';

const Stack = createStackNavigator();

const Navigator = () => (
  <Stack.Navigator
    screenOptions={{ animationEnabled: true, headerTitleAlign: 'center' }}
    initialRouteName="Settings"
  >
    <Stack.Screen
      name="Settings"
      options={{ headerTitle: 'Settings' }}
      component={SettingsScreen}
    />
    <Stack.Screen name="Account" options={{ headerTitle: 'Account' }} component={Account} />
    <Stack.Screen
      name="ChangePassword"
      options={{ headerTitle: 'Change Password' }}
      component={ChangePassword}
    />
    <Stack.Screen
      name="Appearance"
      options={{ headerTitle: 'Appearance' }}
      component={Appearance}
    />
    <Stack.Screen name="About" options={{ headerTitle: 'About' }} component={About} />
  </Stack.Navigator>
);

export default Navigator;
