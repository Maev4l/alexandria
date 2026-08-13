import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import { config } from './config.js';
import App from './App.jsx';
import './index.css';

// Skipped in mock mode: the Cognito identifiers are empty there and configure() would throw.
if (!config.isMock) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.userPoolId,
        userPoolClientId: config.clientId,
        loginWith: {
          oauth: {
            domain: config.oauth.domain,
            scopes: config.oauth.scopes,
            redirectSignIn: [config.oauth.redirectSignIn],
            redirectSignOut: [config.oauth.redirectSignOut],
            responseType: config.oauth.responseType,
          },
        },
      },
    },
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
