import { createStackNavigator } from '@react-navigation/stack';

import LibrariesScreen from './LibrariesScreen';
import CreateLibraryScreen from './CreateLibraryScreen';
import EditLibraryScreen from './EditLibraryScreen';
import ItemsScreen, { ItemsScreenHeader } from './ItemsScreen';

import ScanCodeScreen from './ScanCodeScreen';
import BookDetectionScreen from './BookDetectionScreen';

import CreateItemScreen from './CreateItemScreen';
import BookDetails, { BookDetailsHeader } from './BookDetails';
import EditItemScreen from './EditItemScreen';

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
      name="LibraryItems"
      options={({ route }) => ({
        headerTitle: () => <ItemsScreenHeader route={route} />,
      })}
      component={ItemsScreen}
    />
    <Stack.Screen
      name="BookDetails"
      options={({ route }) => ({
        headerTitle: () => <BookDetailsHeader route={route} />,
      })}
      component={BookDetails}
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

export default Navigator;
