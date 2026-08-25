import { describe, expect, it } from 'vitest';
import { config } from './config.js';

describe('config', () => {
  it('exposes the API base path the CloudFront behavior serves', () => {
    expect(config.apiBaseUrl).toBe('/api');
  });

  it('reads Cognito identifiers from the build-time app config', () => {
    expect(config.userPoolId).toBe('eu-central-1_TEST');
    expect(config.clientId).toBe('test-client-id');
  });

  it('points OAuth redirects at the dev origin when running on localhost', () => {
    expect(config.oauth.redirectSignIn).toBe('http://localhost:5173/');
    expect(config.oauth.redirectSignOut).toBe('http://localhost:5173/login');
  });

  it('names the branded auth domain', () => {
    expect(config.oauth.domain).toBe('alexandria-auth.isnan.eu');
  });
});
