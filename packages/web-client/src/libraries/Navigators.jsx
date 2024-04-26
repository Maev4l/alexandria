import { createStackNavigator } from '@react-navigation/stack';
import { IconButton } from 'react-native-paper';

import LibrariesScreen from './LibrariesScreen';
import CreateLibraryScreen from './CreateLibraryScreen';
import EditLibraryScreen from './EditLibraryScreen';
import ItemsScreen, { ItemsScreenHeader } from './ItemsScreen';

import ScanCodeScreen from './ScanCodeScreen';
import BookDetectionScreen from './BookDetectionScreen';

import CreateItemScreen from './CreateItemScreen';
import BookDetails, { BookDetailsHeader } from './BookDetails';
import EditItemScreen from './EditItemScreen';
import ShareLibrary, { ShareLibraryScreenHeader } from './ShareLibrary';
import UnshareLibrary, { UnshareLibraryScreenHeader } from './UnshareLibrary';
import ItemHistory, { ItemHistoryHeader } from './ItemHistory';
import LendItem, { LendItemScreenHeader } from './LendItem';

import { useAuth } from '../store';

const Stack = createStackNavigator();

const Navigator = () => {
  const { userId } = useAuth();
  return (
    <Stack.Navigator
      screenOptions={{ animationEnabled: true, headerTitleAlign: 'center' }}
      initialRouteName="Libraries"
    >
      <Stack.Screen
        name="Libraries"
        options={{ headerTitle: 'Libraries' }}
        component={LibrariesScreen}
      />
      <Stack.Screen
        name="AddLibrary"
        options={{ headerTitle: 'Add library' }}
        component={CreateLibraryScreen}
      />
      <Stack.Screen
        name="UpdateLibrary"
        options={{ headerTitle: 'Update library' }}
        component={EditLibraryScreen}
      />
      <Stack.Screen
        name="AddItem"
        options={{ headerTitle: 'Add item' }}
        component={CreateItemScreen}
      />
      <Stack.Screen
        name="UpdateItem"
        options={{ headerTitle: 'Update item' }}
        component={EditItemScreen}
      />
      <Stack.Screen
        name="ShareLibrary"
        options={({ route }) => ({
          headerTitle: () => <ShareLibraryScreenHeader route={route} />,
        })}
        component={ShareLibrary}
      />
      <Stack.Screen
        name="UnshareLibrary"
        options={({ route }) => ({
          headerTitle: () => <UnshareLibraryScreenHeader route={route} />,
        })}
        component={UnshareLibrary}
      />
      <Stack.Screen
        name="LibraryItems"
        options={({ route }) => ({
          headerTitle: () => <ItemsScreenHeader route={route} />,
        })}
        component={ItemsScreen}
      />
      <Stack.Screen
        name="LendItem"
        options={({ route }) => ({
          headerTitle: () => <LendItemScreenHeader route={route} />,
        })}
        component={LendItem}
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
        })}
        component={ItemHistory}
      />
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
};

export default Navigator;
