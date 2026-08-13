// Mirrors the Cognito user-pool policy. Returns what is MISSING, in words, so a field can
// name the cause and the next action instead of rejecting the password as "invalid".
const RULES = [
  { test: (p) => p.length >= 8, label: 'at least 8 characters' },
  { test: (p) => /[a-z]/.test(p), label: 'a lowercase letter' },
  { test: (p) => /[A-Z]/.test(p), label: 'an uppercase letter' },
  { test: (p) => /[0-9]/.test(p), label: 'a number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'a symbol' },
];

export const passwordIssues = (password = '') =>
  RULES.filter((rule) => !rule.test(password)).map((rule) => rule.label);
