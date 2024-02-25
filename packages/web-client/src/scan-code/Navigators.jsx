import { createStackNavigator } from '@react-navigation/stack';

import ScanCodeScreen from './ScanCodeScreen';
import DetectionScreen from './DetectionScreen';

const Stack = createStackNavigator();

const Navigator = () => (
  <Stack.Navigator
    screenOptions={{ animationEnabled: true, headerTitleAlign: 'center' }}
    initialRouteName="ScanCode"
  >
    <Stack.Screen
      name="ScanCode"
      options={{ headerTitle: 'Scan Bar Code' }}
      component={ScanCodeScreen}
    />
    <Stack.Screen
      name="Detection"
      options={{ headerTitle: 'Detection' }}
      component={DetectionScreen}
    />
  </Stack.Navigator>
);

export default Navigator;
