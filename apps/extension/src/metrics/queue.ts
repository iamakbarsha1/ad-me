import * as vscode from 'vscode';

interface QueuedEvent {
  type: 'impression' | 'click';
  data: Record<string, unknown>;
  timestamp: number;
}

const QUEUE_KEY = 'ad-me.telemetryQueue';

export class TelemetryQueue {
  private memento: vscode.Memento;

  constructor(globalState: vscode.Memento) {
    this.memento = globalState;
  }

  async enqueue(event: Omit<QueuedEvent, 'timestamp'>): Promise<void> {
    const queue = this.getQueue();
    queue.push({ ...event, timestamp: Date.now() });
    await this.memento.update(QUEUE_KEY, queue);
  }

  getQueue(): QueuedEvent[] {
    return this.memento.get<QueuedEvent[]>(QUEUE_KEY, []);
  }

  async flush(): Promise<QueuedEvent[]> {
    const queue = this.getQueue();
    await this.memento.update(QUEUE_KEY, []);
    return queue;
  }

  async removeProcessed(count: number): Promise<void> {
    const queue = this.getQueue();
    await this.memento.update(QUEUE_KEY, queue.slice(count));
  }
}
