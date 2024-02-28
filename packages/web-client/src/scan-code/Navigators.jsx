import { createStackNavigator } from '@react-navigation/stack';

import ScanCodeScreen from './ScanCodeScreen';
import BookDetectionScreen from './BookDetectionScreen';

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
      name="BooksDetection"
      options={{ headerTitle: 'Detected books' }}
      component={BookDetectionScreen}
    />
  </Stack.Navigator>
);

export default Navigator;
