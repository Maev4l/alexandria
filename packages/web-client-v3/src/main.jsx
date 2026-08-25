import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import { config } from './config.js';
import App from './App.jsx';
import './index.css';

const root = createRoot(document.getElementById('root'));

// Empty Cognito identifiers do not fail at startup — Amplify.configure() accepts them and
// then throws "Auth UserPool not configured" when someone submits the login form. Checking
// here turns a mystifying authentication error into a one-line instruction.
const isMisconfigured = !config.isMock && (!config.userPoolId || !config.clientId);

const SETUP_MESSAGE = [
  'Alexandria v3 is not configured.',
  '',
  'packages/web-client-v3/output.json is missing or empty, so the Cognito user pool id and',
  'client id are blank and sign-in cannot work.',
  '',
  '  aws sso login',
  '  make infra-output',
  '',
  'Then restart the dev server. To work without AWS, run with VITE_MOCK=1 instead.',
].join('\n');

if (isMisconfigured) {
  // Rendered rather than thrown: an uncaught error in main.jsx is a white screen, which is a
  // worse diagnostic than the one being replaced. Unstyled on purpose too — this is a
  // developer-facing build failure, not a surface the imprint has anything to say about.
  root.render(
    <pre style={{ margin: '2rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
      {SETUP_MESSAGE}
    </pre>,
  );
} else {
  // Skipped in mock mode: the identifiers are empty there by design and never used.
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

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
