import { createStackNavigator } from '@react-navigation/stack';

import SettingsScreen from './SettingsScreen';

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
  </Stack.Navigator>
);

export default Navigator;
