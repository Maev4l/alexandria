import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { BottomNavigation } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { SignIn, SignUp } from './security';
import { LibrariesNavigators } from './libraries';
import { SettingsNavigators } from './settings';

const AuthenticationStack = createStackNavigator();

export const AuthenticationNavigator = () => (
  <AuthenticationStack.Navigator
    screenOptions={{ animationEnabled: true, headerTitleAlign: 'center' }}
  >
    <AuthenticationStack.Screen name="SignIn" options={{ headerShown: false }} component={SignIn} />
    <AuthenticationStack.Screen
      name="SignUp"
      options={{ headerTitle: 'Sign Up' }}
      component={SignUp}
    />
  </AuthenticationStack.Navigator>
);

const AppTab = createBottomTabNavigator();

export const AppNavigator = () => (
  <AppTab.Navigator
    screenOptions={{
      headerShown: false,
    }}
    tabBar={({ navigation, state, descriptors, insets }) => (
      <BottomNavigation.Bar
        navigationState={state}
        safeAreaInsets={insets}
        onTabPress={({ route, preventDefault }) => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (event.defaultPrevented) {
            preventDefault();
          } else {
            navigation.dispatch({
              ...CommonActions.navigate(route.name, route.params),
              target: state.key,
            });
          }
        }}
        renderIcon={({ route, focused, color }) => {
          const { options } = descriptors[route.key];
          if (options.tabBarIcon) {
            return options.tabBarIcon({ focused, color, size: 24 });
          }

          return null;
        }}
        getLabelText={({ route }) => {
          const { options } = descriptors[route.key];
          let label;
          if (options.tabBarLabel) {
            label = options.tabBarLabel;
          } else if (options.title) {
            label = options.title;
          } else {
            label = route.title;
          }
          return label;
        }}
      />
    )}
  >
    <AppTab.Screen
      name="Libraries"
      component={LibrariesNavigators}
      options={{
        tabBarLabel: 'Libraries',
        tabBarIcon: ({ color, size }) => <Icon name="home" size={size} color={color} />,
      }}
    />
    <AppTab.Screen
      name="Settings"
      component={SettingsNavigators}
      options={{
        tabBarLabel: 'Settings',
        tabBarIcon: ({ color, size }) => <Icon name="cog" size={size} color={color} />,
      }}
    />
  </AppTab.Navigator>
);
