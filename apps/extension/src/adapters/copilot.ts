import type { AIToolAdapter } from './types.js';

export class CopilotAdapter implements AIToolAdapter {
  readonly name = 'copilot';

  async detect(): Promise<boolean> {
    // TODO: Check if GitHub Copilot extension is active
    return false;
  }

  onThinkingStart(_callback: () => void): void {
    // TODO: Hook into Copilot thinking state
  }

  onThinkingEnd(_callback: () => void): void {
    // TODO: Hook into Copilot completion
  }

  dispose(): void {}
}
