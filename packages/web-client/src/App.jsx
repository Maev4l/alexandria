import { useEffect } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { useSelector, useDispatch } from './store';
import { getToken } from './security';
import { AuthenticationNavigator, AppNavigator } from './Navigators';

const Splash = () => (
  <View
    style={{
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Text adjustsFontSizeToFit variant="displayMedium" style={{ marginBottom: 10 }}>
      ALEXANDRIA
    </Text>
  </View>
);

const App = () => {
  const authState = useSelector((state) => state.authn.state);
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(getToken());
  }, []);

  if (authState === 'FETCHING_TOKEN') {
    return <Splash />;
  }
  if (authState === 'LOGGED_OUT') {
    return <AuthenticationNavigator />;
  }

  return <AppNavigator />;
};

export default App;
