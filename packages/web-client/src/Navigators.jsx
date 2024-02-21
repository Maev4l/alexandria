import { createStackNavigator } from '@react-navigation/stack';

import { SignIn, SignUp } from './security';

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
