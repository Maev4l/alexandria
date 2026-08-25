// Cognito and API configuration. Values are injected at build time from output.json
// (see vite.config.js) so nothing in src/ imports a gitignored file.
const appConfig = __APP_CONFIG__;

const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const origin = isDev ? 'http://localhost:5173' : 'https://alexandria.isnan.eu';

export const config = {
  userPoolId: appConfig.userPoolId,
  clientId: appConfig.clientId,
  region: 'eu-central-1',
  // CloudFront routes /api/* to API Gateway; the dev server proxies the same path.
  apiBaseUrl: '/api',
  buildHash: __BUILD_HASH__,
  // package.json's version. Printed on About beside the commit hash: between them they name
  // the exact build a reader is running, which is the only reason a private app shows either.
  appVersion: __APP_VERSION__,
  isMock: __MOCK__,
  oauth: {
    domain: 'alexandria-auth.isnan.eu',
    scopes: ['openid', 'email', 'profile'],
    redirectSignIn: `${origin}/`,
    redirectSignOut: `${origin}/login`,
    responseType: 'code',
  },
};
