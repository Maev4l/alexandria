import { fetchToken } from '../security';

const basePath = 'https://api-alexandria.isnan.eu';

const get = async (path) => {
  const token = await fetchToken();
  const response = await fetch(`${basePath}${path}`, {
    method: 'GET',
    headers: { Authorization: token },
  });

  const text = await response.text();
  if (!response.ok) {
    if (text) {
      const json = JSON.parse(text);
      const { message } = json;
      if (message) {
        throw new Error(message);
      }
    }
    throw new Error(`Server error: ${response.statusText}`);
  } else if (text) {
    const json = JSON.parse(text);
    return json;
  }
  return null;
};

const post = async (path, data) => {
  const token = await fetchToken();

  const response = await fetch(`${basePath}${path}`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { Authorization: token, 'Content-Type': 'application/json' },
  });
  const text = await response.text();
  if (!response.ok) {
    if (text) {
      const json = JSON.parse(text);
      const { message } = json;
      if (message) {
        throw new Error(message);
      }
    }
    throw new Error(`Server error: ${response.statusText}`);
  } else if (text) {
    const json = JSON.parse(text);
    return json;
  }
  return null;
};

const del = async (path) => {
  const token = await fetchToken();
  await fetch(`${basePath}${path}`, {
    method: 'DELETE',
    headers: { Authorization: token },
  });
};

export default {
  get,
  post,
  del,
};
