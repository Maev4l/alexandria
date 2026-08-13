import { fetchAuthSession } from 'aws-amplify/auth';
import { config } from '@/config';

const BASE_URL = `${config.apiBaseUrl}/v1`;

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const authHeader = async () => {
  // Mock mode never has a Cognito session, and asking Amplify for one throws.
  if (config.isMock) return {};
  try {
    const session = await fetchAuthSession();
    const token = session?.tokens?.idToken?.toString();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

const request = async (path, options = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(await authHeader()), ...options.headers },
  });

  // Mutations return empty bodies; do not try to parse one.
  const isEmpty =
    response.status === 204 ||
    response.headers.get('content-length') === '0' ||
    !(response.headers.get('content-type') ?? '').includes('json');

  const data = isEmpty ? null : await response.json();

  if (!response.ok) {
    throw new ApiError(data?.message ?? 'The request failed.', response.status, data);
  }
  return data;
};

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
