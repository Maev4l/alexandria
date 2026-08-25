import { describe, expect, it } from 'vitest';
import { passwordIssues } from './password.js';

describe('passwordIssues', () => {
  it('accepts a password meeting every Cognito rule', () => {
    expect(passwordIssues('Correct1!horse')).toEqual([]);
  });

  it('names each missing requirement rather than saying the password is invalid', () => {
    expect(passwordIssues('short')).toEqual([
      'at least 8 characters',
      'an uppercase letter',
      'a number',
      'a symbol',
    ]);
  });

  it('treats an empty password as every requirement missing', () => {
    expect(passwordIssues('').length).toBe(5);
  });

  it('tolerates being called with nothing', () => {
    expect(passwordIssues().length).toBe(5);
  });
});
