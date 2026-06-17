import type { AdSurface } from '@ad-me/shared';
import { ApiClient } from './client.js';

export class TelemetryClient {
  constructor(private client: ApiClient) {}

  async reportImpression(data: {
    adId: string;
    blockId: string;
    idempotencyKey: string;
    surface: AdSurface;
    durationMs: number;
  }): Promise<void> {
    await this.client.fetch('/telemetry/impression', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async reportClick(data: {
    impressionId: string;
    adId: string;
    idempotencyKey: string;
  }): Promise<void> {
    await this.client.fetch('/telemetry/click', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}
