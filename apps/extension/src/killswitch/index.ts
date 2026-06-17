import { KILLSWITCH_POLL_INTERVAL_MS } from '@ad-me/shared';

export class KillswitchPoller {
  private interval: NodeJS.Timeout | null = null;
  private _enabled = false;

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

  private async poll(): Promise<void> {
    try {
      // TODO: Use ApiClient to fetch /killswitch
      // const status = await apiClient.fetch<KillswitchStatus>('/killswitch');
      // this._enabled = status.enabled;
    } catch {
      // On error, keep current state
    }
  }
}
