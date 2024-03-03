import { createStackNavigator } from '@react-navigation/stack';

import LibrariesScreen from './LibrariesScreen';
import CreateLibraryScreen from './CreateLibraryScreen';
import EditLibraryScreen from './EditLibraryScreen';

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
  </Stack.Navigator>
);

export default Navigator;
