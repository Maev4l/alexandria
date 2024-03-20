import { createStackNavigator } from '@react-navigation/stack';

import SearchScreen from './SearchScreen';

const Stack = createStackNavigator();

const Navigator = () => (
  <Stack.Navigator
    screenOptions={{ animationEnabled: true, headerTitleAlign: 'center' }}
    initialRouteName="SearchItems"
  >
    <Stack.Screen
      name="SearchItems"
      options={{ headerTitle: 'Search items' }}
      component={SearchScreen}
    />
  </Stack.Navigator>
);

export default Navigator;
