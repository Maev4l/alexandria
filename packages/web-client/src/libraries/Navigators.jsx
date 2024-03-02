import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native-paper';

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
      name="CreateLibrary"
      options={{ headerTitle: 'Add library' }}
      component={CreateLibraryScreen}
    />
    <Stack.Screen
      name="EditLibrary"
      options={({ route }) => ({
        headerTitle: () => (
          <Text
            style={{
              fontSize: 18,
              fontWeight: 500,
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              overflowWrap: 'normal',
              whiteSpace: 'nowrap',
            }}
          >
            {route.params.libraryName}
          </Text>
        ),
      })}
      component={EditLibraryScreen}
    />
  </Stack.Navigator>
);

export default Navigator;
