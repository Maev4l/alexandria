import { describe, expect, it } from 'vitest';
import { classifyOAuthCallback } from './oauth.js';

describe('classifyOAuthCallback', () => {
  it('returns null when there is nothing in the URL', () => {
    expect(classifyOAuthCallback('')).toBeNull();
    expect(classifyOAuthCallback('?code=abc')).toBeNull();
  });

  it('treats an account link as a success, because Cognito reports it as an error', () => {
    const result = classifyOAuthCallback(
      '?error_description=Already+found+an+entry+for+username+google_123.+Account+linked',
    );
    expect(result.type).toBe('linked');
  });

  it('names the cause when the email already has an account', () => {
    const result = classifyOAuthCallback('?error_description=PreSignUp+failed:+user+already+exists');
    expect(result.type).toBe('error');
    expect(result.message).toMatch(/already exists/i);
  });

  it('passes an unrecognised error through rather than swallowing it', () => {
    const result = classifyOAuthCallback('?error_description=Something+specific+broke');
    expect(result.type).toBe('error');
    expect(result.message).toBe('Something specific broke');
  });
});
