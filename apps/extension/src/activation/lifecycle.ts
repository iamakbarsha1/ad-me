import type { AIToolAdapter } from '../adapters/types.js';
import { ClaudeCodeAdapter } from '../adapters/claude-code.js';
import { CopilotAdapter } from '../adapters/copilot.js';
import { CodexAdapter } from '../adapters/codex-cli.js';

export class LifecycleManager {
  private adapters: AIToolAdapter[] = [];

  async initialize(): Promise<void> {
    const candidates = [
      new ClaudeCodeAdapter(),
      new CopilotAdapter(),
      new CodexAdapter(),
    ];

    for (const adapter of candidates) {
      if (await adapter.detect()) {
        this.adapters.push(adapter);
      }
    }
  }

  getActiveAdapters(): AIToolAdapter[] {
    return this.adapters;
  }

  dispose(): void {
    this.adapters.forEach(a => a.dispose());
    this.adapters = [];
  }
}
