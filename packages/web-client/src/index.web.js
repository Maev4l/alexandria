import 'react-native-gesture-handler'; // <-- Must be the first import of the entry file
import { AppRegistry } from 'react-native';
import { Amplify } from 'aws-amplify';

import { StoreProvider } from './store';
import App from './App';
import { Loader, NotificationBar, AppPreferencesProvider } from './components';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.userPoolId,
      userPoolClientId: process.env.clientId,
    },
  },
});

const Main = () => (
  <StoreProvider>
    <AppPreferencesProvider>
      <NotificationBar />
      <Loader />
      <App />
    </AppPreferencesProvider>
  </StoreProvider>
);

AppRegistry.registerComponent('Main', () => Main);

AppRegistry.runApplication('Main', {
  rootTag: document.getElementById('root'),
});
