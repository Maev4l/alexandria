// Cognito reports a successful identity link as an OAuth *error*, so the callback has to be
// classified rather than trusted. A link is a success that needs one more sign-in.
export const classifyOAuthCallback = (search) => {
  const description = new URLSearchParams(search).get('error_description');
  if (!description) return null;

  const lowered = description.toLowerCase();
  if (lowered.includes('linked')) return { type: 'linked' };
  if (lowered.includes('user already exists')) {
    return { type: 'error', message: 'An account with this email already exists. Sign in instead.' };
  }
  return { type: 'error', message: description };
};
