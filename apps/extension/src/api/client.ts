import { TokenStore } from '../auth/token-store.js';

const API_BASE = 'https://api.ad-me.dev'; // TODO: configurable

export class ApiClient {
  constructor(private tokenStore: TokenStore) {}

  async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.tokenStore.getAccessToken();

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (res.status === 401) {
      // TODO: Attempt token refresh
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    return res.json() as Promise<T>;
  }
}
