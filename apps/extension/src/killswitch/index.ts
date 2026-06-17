import type { KillswitchStatus } from '@ad-me/shared';
import { KILLSWITCH_POLL_INTERVAL_MS } from '@ad-me/shared';
import { ApiClient } from '../api/client.js';

export class KillswitchPoller {
  private interval: NodeJS.Timeout | null = null;
  private _enabled = false;
  private changeCallbacks: ((killed: boolean) => void)[] = [];

  constructor(private apiClient: ApiClient) {}

  get isKilled(): boolean {
    return this._enabled;
  }

  start(): void {
    this.poll();
    this.interval = setInterval(() => this.poll(), KILLSWITCH_POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  onKillswitchChange(callback: (killed: boolean) => void): void {
    this.changeCallbacks.push(callback);
  }

  private async poll(): Promise<void> {
    try {
      const status = await this.apiClient.fetchUnauth<KillswitchStatus>('/killswitch');
      const prev = this._enabled;
      this._enabled = status.enabled;

      if (prev !== this._enabled) {
        this.changeCallbacks.forEach((cb) => cb(this._enabled));
      }
    } catch {
      // On error, keep current state
    }
  }
}
