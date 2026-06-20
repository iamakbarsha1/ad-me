const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export async function apiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem('ad-me-auth');
  if (!stored) return '';
  try {
    return (JSON.parse(stored) as { accessToken?: string }).accessToken ?? '';
  } catch {
    return '';
  }
}

function getRefreshToken(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem('ad-me-auth');
  if (!stored) return '';
  try {
    return (JSON.parse(stored) as { refreshToken?: string }).refreshToken ?? '';
  } catch {
    return '';
  }
}

function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('ad-me-auth');
  window.location.href = '/login';
}

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { accessToken: string; refreshToken: string };
    const stored = localStorage.getItem('ad-me-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.accessToken = data.accessToken;
      parsed.refreshToken = data.refreshToken;
      localStorage.setItem('ad-me-auth', JSON.stringify(parsed));
    }
    return data.accessToken;
  } catch {
    return null;
  }
}

async function authFetch<T>(path: string, init: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      const retry = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          ...(init.headers as Record<string, string> ?? {}),
          Authorization: `Bearer ${newToken}`,
        },
      });
      if (!retry.ok) {
        const err = await retry.json().catch(() => ({ error: 'Request failed' }));
        throw new Error((err as { error?: string }).error || 'Request failed');
      }
      return retry.json() as Promise<T>;
    }
    clearAuth();
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error((err as { error?: string }).error || 'Request failed');
  }
  return res.json() as Promise<T>;
}

export function apiAuthGet<T>(path: string): Promise<T> {
  return authFetch<T>(path, {});
}

export function apiAuthPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return authFetch<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function apiAuthPatch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return authFetch<T>(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function apiAuthPut<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return authFetch<T>(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function apiAuthDelete<T>(path: string): Promise<T> {
  return authFetch<T>(path, { method: 'DELETE' });
}
