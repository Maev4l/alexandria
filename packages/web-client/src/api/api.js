import { fetchToken } from '../security';

const basePath = 'https://api-alexandria.isnan.eu';

const processResponse = async (response) => {
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

const get = async (path) => {
  const token = await fetchToken();
  const response = await fetch(`${basePath}${path}`, {
    method: 'GET',
    headers: { Authorization: token },
  });

  const res = await processResponse(response);
  return res;
};

const post = async (path, data) => {
  const token = await fetchToken();

  const response = await fetch(`${basePath}${path}`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { Authorization: token, 'Content-Type': 'application/json' },
  });
  const res = await processResponse(response);
  return res;
};

const del = async (path) => {
  const token = await fetchToken();
  const response = await fetch(`${basePath}${path}`, {
    method: 'DELETE',
    headers: { Authorization: token },
  });

  const res = await processResponse(response);
  return res;
};

const put = async (path, data) => {
  const token = await fetchToken();
  const response = await fetch(`${basePath}${path}`, {
    method: 'PUT',
    headers: { Authorization: token },
    body: JSON.stringify(data),
  });

  const res = await processResponse(response);
  return res;
};

export default {
  get,
  post,
  del,
  put,
};
