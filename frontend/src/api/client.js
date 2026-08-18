const API_BASE = '';
let tokenRefreshPromise = null;

export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function request(path, options = {}) {
  // Always fetch latest token from localStorage
  const token = localStorage.getItem('access_token');
  
  // Clone options and ensure headers object exists
  const nextOptions = { ...options };
  nextOptions.headers = { ...options.headers };

  // Set Authorization header if user has token and request didn't explicitly override it
  if (token && !nextOptions.headers.Authorization && nextOptions.headers.Authorization !== null) {
    nextOptions.headers.Authorization = `Bearer ${token}`;
  }
  // Allow explicitly deleting Authorization header by passing it as null
  if (nextOptions.headers.Authorization === null) {
    delete nextOptions.headers.Authorization;
  }

  let res = await fetch(`${API_BASE}${path}`, nextOptions);

  if (res.status === 401) {
    const refreshTokenValue = localStorage.getItem('refresh_token');
    
    // Only attempt refresh if we actually have a refresh token and we aren't already requesting auth routes themselves
    if (refreshTokenValue && !path.startsWith('/auth/auth/refresh')) {
      try {
        if (!tokenRefreshPromise) {
          tokenRefreshPromise = (async () => {
            const refreshRes = await fetch(`${API_BASE}/auth/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: refreshTokenValue }),
            });
            
            if (!refreshRes.ok) {
              throw new Error('Refresh failed');
            }
            
            const refreshData = await refreshRes.json();
            if (refreshData.access_token) {
              localStorage.setItem('access_token', refreshData.access_token);
              
              // Rotate refresh token with new access token
              try {
                const rotateRes = await fetch(`${API_BASE}/auth/auth/refresh/get`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${refreshData.access_token}` },
                });
                if (rotateRes.ok) {
                  const rotateData = await rotateRes.json();
                  if (rotateData.refresh_token) {
                    localStorage.setItem('refresh_token', rotateData.refresh_token);
                  }
                }
              } catch (err) {
                console.error('Error rotating refresh token:', err);
              }
              
              return refreshData.access_token;
            }
            throw new Error('Token refresh response empty');
          })();
        }

        const newToken = await tokenRefreshPromise;
        tokenRefreshPromise = null;

        // Retry the original request with the new access token
        nextOptions.headers.Authorization = `Bearer ${newToken}`;
        res = await fetch(`${API_BASE}${path}`, nextOptions);
      } catch (err) {
        tokenRefreshPromise = null;
        console.error('Session expired, logging out:', err);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.dispatchEvent(new Event('auth-logout'));
      }
    } else {
      // Unauthorized without refresh token, trigger logout
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.dispatchEvent(new Event('auth-logout'));
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = data?.detail || `Ошибка ${res.status}`;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }

  if (res.status === 204) return null;
  return res.json();
}
