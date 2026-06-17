import { TokenStore } from '../auth/token-store.js';

const API_BASE = 'https://api.ad-me.dev'; // TODO: make configurable

export class ApiClient {
  constructor(private tokenStore: TokenStore) {}

  async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.tokenStore.getAccessToken();

    const res = await globalThis.fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (res.status === 401) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        return this.fetch(path, options);
      }
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || `API error: ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  async fetchUnauth<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await globalThis.fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || `API error: ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  private async tryRefresh(): Promise<boolean> {
    try {
      const refreshToken = await this.tokenStore.getRefreshToken();
      if (!refreshToken) return false;

      const res = await globalThis.fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return false;

      const data = (await res.json()) as { accessToken: string; refreshToken: string };
      await this.tokenStore.setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }
}
