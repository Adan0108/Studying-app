const BASE_URL = 'http://localhost:4000';  // swap for prod URL

/**
 * options.method defaults to 'GET'.
 * options.body should be a JS object for JSON.
 */
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('accessToken');
  const refresh = localStorage.getItem('refreshToken');

  // assemble headers
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(refresh && { 'x-refresh-token': refresh }),
    ...options.headers
  };

  // stringify body
  const init = {
    method: options.method || 'GET',
    headers,
    ...(options.body && { body: JSON.stringify(options.body) })
  };

  const res = await fetch(BASE_URL + path, init);

  // if backend sent new access token, store it
  const newAccess = res.headers.get('x-access-token');
  if (newAccess) {
    localStorage.setItem('accessToken', newAccess);
    // Mirror to chrome.storage so background/content can read
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ accessToken: newAccess });
    }
  }

  if (res.status === 401) {
    // unauthorized: tokens invalid → clear and reload popup
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    throw new Error('Unauthorized');
  }

  if (res.status === 204) return null;
  return res.json();
}
