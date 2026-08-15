import { describe, expect, it } from 'vitest';
import { tokenFacts } from './diagnose.js';

// TEMPORARY, reverts with the diagnostic commits.
const b64url = (obj) =>
  btoa(String.fromCodePoint(...new TextEncoder().encode(JSON.stringify(obj))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const tokenFor = (claims) => `header.${b64url(claims)}.signature`;

const nowSeconds = Math.floor(Date.now() / 1000);
const realistic = {
  iss: 'https://cognito-idp.eu-central-1.amazonaws.com/eu-central-1_ABC',
  aud: 'client-id-123',
  token_use: 'id',
  iat: nowSeconds - 4,
  exp: nowSeconds + 3596,
  sub: 'a-uuid-that-must-never-be-logged',
  email: 'cecile@example.com',
  name: 'Cécile',
  'custom:Id': 'OWNER2',
};

describe('the token claims capture', () => {
  it('reports the age against the browser clock, which is the measurement', () => {
    const facts = tokenFacts(tokenFor(realistic));
    expect(facts).toMatchObject({ token_use: 'id', aud: 'client-id-123' });
    // Asserted as a range, not an exact second. The difference carries a sub-second fraction, so
    // pinning it to a literal makes the test fail on the rounding boundary rather than on a
    // defect — which is what the first version of this test did.
    expect(facts.ageSecondsBrowserClock).toBeGreaterThanOrEqual(3);
    expect(facts.ageSecondsBrowserClock).toBeLessThanOrEqual(5);
  });

  it('never returns sub, email or any custom claim', () => {
    const facts = tokenFacts(tokenFor(realistic));
    const serialised = JSON.stringify(facts);
    expect(serialised).not.toContain('a-uuid-that-must-never-be-logged');
    expect(serialised).not.toContain('cecile@example.com');
    expect(serialised).not.toContain('OWNER2');
    expect(Object.keys(facts).sort()).toEqual([
      'ageSecondsBrowserClock', 'aud', 'exp', 'iat', 'iss', 'secondsToExpiry', 'token_use',
    ]);
  });

  it('shows a clock BEHIND Cognito as a negative age rather than hiding it', () => {
    // The condition the whole theory rests on: if this machine's clock trails the issuer's, a
    // fresh token looks issued in the future. Clamping that to zero would erase the evidence.
    const facts = tokenFacts(tokenFor({ ...realistic, iat: nowSeconds + 30 }));
    expect(facts.ageSecondsBrowserClock).toBeLessThanOrEqual(-29);
  });

  it('survives a non-ASCII claim rather than throwing mid-diagnosis', () => {
    expect(tokenFacts(tokenFor(realistic)).iss).toContain('cognito-idp');
  });

  it('says so plainly when the token is absent or malformed', () => {
    expect(tokenFacts(null)).toEqual({ claims: 'absent' });
    expect(tokenFacts('not-a-jwt')).toMatchObject({ claims: 'absent' });
  });
});
