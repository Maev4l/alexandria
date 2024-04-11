import { createStackNavigator } from '@react-navigation/stack';

import { BookDetailsHeader, BookDetails } from '../libraries';
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
    <Stack.Screen
      name="BookDetails"
      options={({ route }) => ({
        headerTitle: () => <BookDetailsHeader route={route} />,
      })}
      component={BookDetails}
    />
  </Stack.Navigator>
);

export default Navigator;
