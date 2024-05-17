import { createStackNavigator } from '@react-navigation/stack';
import { IconButton } from 'react-native-paper';

import {
  BookDetailsHeader,
  BookDetails,
  ItemHistoryHeader,
  ItemHistory,
  deleteLibraryItemHistory,
} from '../libraries';
import SearchScreen from './SearchScreen';
import { useAuth, useDispatch, useSelector } from '../store';

const Stack = createStackNavigator();

const Navigator = () => {
  const { userId } = useAuth();
  const dispatch = useDispatch();
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
      <Stack.Screen
        name="ItemHistory"
        options={({ route }) => ({
          headerTitle: () => <ItemHistoryHeader route={route} />,
          headerRight: () => {
            const {
              params: { item },
            } = route;

            const { lentTo } = item;

            const eventsCount = useSelector((state) => state.itemHistory.events.length);
            return eventsCount !== 0 && !lentTo ? (
              <IconButton
                icon="trash-can-outline"
                size={24}
                onPress={() => dispatch(deleteLibraryItemHistory(item))}
              />
            ) : null;
          },
        })}
        component={ItemHistory}
      />
    </Stack.Navigator>
  );
};

export default Navigator;
