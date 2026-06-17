import type { AIToolAdapter } from './types.js';

export class ClaudeCodeAdapter implements AIToolAdapter {
  readonly name = 'claude-code';

  async detect(): Promise<boolean> {
    // TODO: Detect Claude Code terminal activity
    return false;
  }

  onThinkingStart(_callback: () => void): void {
    // TODO: Monitor terminal for thinking indicators
  }

  onThinkingEnd(_callback: () => void): void {
    // TODO: Monitor terminal for thinking end
  }

  dispose(): void {
    // TODO: Cleanup terminal watchers
  }
}
