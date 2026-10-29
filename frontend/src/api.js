let csrfToken = '';
export function setCsrf(value) {
  csrfToken = value || '';
}
export async function api(path, options = {}) {
  const response = await fetch(`${import.meta.env.BASE_URL}api${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...options.headers,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const payload = await response
    .json()
    .catch(() => ({ error: 'The server returned an unexpected response.' }));
  if (!response.ok) {
    const e = new Error(payload.error || 'Request failed.');
    e.status = response.status;
    e.details = payload.details;
    throw e;
  }
  return payload.data;
}
