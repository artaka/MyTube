const API_BASE = '';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = data?.detail || `Ошибка ${res.status}`;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function login(username, password) {
  const body = new URLSearchParams();
  body.append('username', username);
  body.append('password', password);
  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

export async function register(email, username, password) {
  return request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });
}

export function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function logout(token) {
  return request('/auth/logout', {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export async function getCurrentUser(token) {
  return request('/users/me', {
    headers: authHeaders(token),
  });
}

export async function patchCurrentUser(token, data) {
  return request('/users/me', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(data),
  });
}

export async function refreshToken(refreshTokenValue) {
  return request('/auth/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshTokenValue }),
  });
}

export async function getGoogleAuthUrl() {
  return request('/auth/authorize');
}

export async function handleGoogleCallback(code, state) {
  return request(`/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
}
