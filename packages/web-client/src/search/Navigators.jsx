import { createStackNavigator } from '@react-navigation/stack';
import { IconButton } from 'react-native-paper';

import { BookDetailsHeader, BookDetails } from '../libraries';
import SearchScreen from './SearchScreen';
import { useAuth } from '../store';

const Stack = createStackNavigator();

const Navigator = () => {
  const { userId } = useAuth();
  return (
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
        options={({ route, navigation }) => {
          const {
            params: { book },
          } = route;

          return {
            headerTitle: () => <BookDetailsHeader route={route} />,
            headerRight: () =>
              userId === book.ownerId ? (
                <IconButton
                  icon="history"
                  size={24}
                  onPress={() => navigation.navigate('ItemHistory', { item: book })}
                />
              ) : null,
          };
        }}
        component={BookDetails}
      />
    </Stack.Navigator>
  );
};

export default Navigator;
