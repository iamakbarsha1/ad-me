import { QUALIFIED_IMPRESSION_MS } from '@ad-me/shared';

export class ImpressionTracker {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private startTimes: Map<string, number> = new Map();

  startTracking(impressionId: string, onQualified: (durationMs: number) => void): void {
    this.startTimes.set(impressionId, Date.now());

    const timer = setTimeout(() => {
      const start = this.startTimes.get(impressionId);
      if (start) {
        onQualified(Date.now() - start);
      }
      this.cleanup(impressionId);
    }, QUALIFIED_IMPRESSION_MS);

    this.timers.set(impressionId, timer);
  }

  cancelTracking(impressionId: string): void {
    this.cleanup(impressionId);
  }

  private cleanup(impressionId: string): void {
    const timer = this.timers.get(impressionId);
    if (timer) clearTimeout(timer);
    this.timers.delete(impressionId);
    this.startTimes.delete(impressionId);
  }

  dispose(): void {
    for (const [id] of this.timers) {
      this.cleanup(id);
    }
  }
}
