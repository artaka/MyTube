import { request, authHeaders } from './client';

export async function login(username, password) {
  const body = new URLSearchParams();
  body.append('username', username);
  body.append('password', password);
  return request('/auth/login', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: null // Skip auth token for login
    },
    body,
  });
}

export async function register(email, username, password) {
  return request('/auth/register', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: null // Skip auth token for register
    },
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
    headers: { 
      'Content-Type': 'application/json',
      Authorization: null // Skip access token header
    },
    body: JSON.stringify({ refresh_token: refreshTokenValue }),
  });
}

export async function getRefreshToken(token) {
  return request('/auth/auth/refresh/get', {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export async function getGoogleAuthUrl() {
  return request('/auth/authorize', {
    headers: { Authorization: null }
  });
}

export async function handleGoogleCallback(code, state) {
  return request(`/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, {
    headers: { Authorization: null }
  });
}

export async function getUserById(userId) {
  return request(`/users/${userId}`);
}

export async function deleteUser(token, userId) {
  return request(`/users/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}


