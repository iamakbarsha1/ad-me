import type { AdServeResponse, AdSurface } from '@ad-me/shared';
import { ApiClient } from './client.js';

export class AdService {
  private cache: Map<AdSurface, AdServeResponse> = new Map();

  constructor(private client: ApiClient) {}

  async fetchNext(surface: AdSurface): Promise<AdServeResponse | null> {
    try {
      const ad = await this.client.fetch<AdServeResponse>(`/ads/next?surface=${surface}&region=IN`);
      this.cache.set(surface, ad);
      return ad;
    } catch {
      return this.cache.get(surface) ?? null;
    }
  }

  async prefetch(surfaces: AdSurface[]): Promise<void> {
    await Promise.allSettled(surfaces.map(s => this.fetchNext(s)));
  }

  getCached(surface: AdSurface): AdServeResponse | null {
    return this.cache.get(surface) ?? null;
  }
}
