import type { AIToolAdapter } from './types.js';

export class CodexAdapter implements AIToolAdapter {
  readonly name = 'codex-cli';

  async detect(): Promise<boolean> {
    // TODO: Detect Codex CLI terminal activity
    return false;
  }

  onThinkingStart(_callback: () => void): void {
    // TODO: Monitor for Codex thinking
  }

  onThinkingEnd(_callback: () => void): void {
    // TODO: Monitor for Codex completion
  }

  dispose(): void {}
}
