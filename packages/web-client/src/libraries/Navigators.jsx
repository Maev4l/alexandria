import { createStackNavigator } from '@react-navigation/stack';

import LibrariesScreen from './LibrariesScreen';

const Stack = createStackNavigator();

const Navigator = () => (
  <Stack.Navigator
    screenOptions={{ animationEnabled: true, headerTitleAlign: 'center' }}
    initialRouteName="Libraries"
  >
    <Stack.Screen
      name="Libraries"
      options={{ headerTitle: 'Libraries' }}
      component={LibrariesScreen}
    />
  </Stack.Navigator>
);

export default Navigator;
