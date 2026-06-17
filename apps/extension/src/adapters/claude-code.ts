import * as vscode from 'vscode';
import type { AIToolAdapter } from './types.js';

export class ClaudeCodeAdapter implements AIToolAdapter {
  readonly name = 'claude-code';

  private thinkingStartCb: (() => void) | null = null;
  private thinkingEndCb: (() => void) | null = null;
  private isThinking = false;
  private debounceTimer: NodeJS.Timeout | null = null;
  private disposables: vscode.Disposable[] = [];

  private readonly SPINNER_PATTERN = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/;
  private readonly THINKING_PATTERN = /\b[Tt]hinking\b/;
  private readonly DEBOUNCE_MS = 2000;

  async detect(): Promise<boolean> {
    return vscode.window.terminals.some(
      (t) => t.name.toLowerCase().includes('claude')
    );
  }

  onThinkingStart(callback: () => void): void {
    this.thinkingStartCb = callback;
    this.startMonitoring();
  }

  onThinkingEnd(callback: () => void): void {
    this.thinkingEndCb = callback;
  }

  private startMonitoring(): void {
    // onDidWriteTerminalData is a proposed API; cast to access it safely
    const win = vscode.window as typeof vscode.window & {
      onDidWriteTerminalData?: (
        listener: (e: { terminal: vscode.Terminal; data: string }) => void
      ) => vscode.Disposable;
    };

    if (typeof win.onDidWriteTerminalData === 'function') {
      const listener = win.onDidWriteTerminalData((e) => {
        if (!e.terminal.name.toLowerCase().includes('claude')) {
          return;
        }

        const data = e.data;
        const hasSpinner = this.SPINNER_PATTERN.test(data);
        const hasThinking = this.THINKING_PATTERN.test(data);

        if (hasSpinner || hasThinking) {
          this.resetDebounce();

          if (!this.isThinking) {
            this.isThinking = true;
            this.thinkingStartCb?.();
          }
        }
      });

      this.disposables.push(listener);
    } else {
      // Fallback: poll terminal state every 500ms
      const pollInterval = setInterval(() => {
        const hasClaudeTerminal = vscode.window.terminals.some(
          (t) => t.name.toLowerCase().includes('claude')
        );
        // Without terminal data access, we can only detect terminal presence
        // This is a degraded mode; thinking detection won't work without the proposed API
        if (!hasClaudeTerminal && this.isThinking) {
          this.isThinking = false;
          this.thinkingEndCb?.();
        }
      }, 500);

      this.disposables.push({
        dispose: () => clearInterval(pollInterval),
      });
    }
  }

  private resetDebounce(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      if (this.isThinking) {
        this.isThinking = false;
        this.thinkingEndCb?.();
      }
      this.debounceTimer = null;
    }, this.DEBOUNCE_MS);
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    this.thinkingStartCb = null;
    this.thinkingEndCb = null;
    this.isThinking = false;
  }
}
