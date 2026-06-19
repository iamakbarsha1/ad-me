import * as vscode from 'vscode';
import type { AIToolAdapter } from './types.js';

export class ClaudeCodeAdapter implements AIToolAdapter {
  readonly name = 'claude-code';

  private thinkingStartCb: (() => void) | null = null;
  private thinkingEndCb: (() => void) | null = null;
  private isThinking = false;
  private debounceTimer: NodeJS.Timeout | null = null;
  private disposables: vscode.Disposable[] = [];
  private streamingExecutions = new Set<vscode.TerminalShellExecution>();
  private hasStreamingSource = false;

  // Braille spinner characters used by Claude Code during thinking
  private readonly SPINNER_PATTERN = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/;
  // Thinking-state keywords (no word boundaries — ANSI escape codes may be adjacent)
  private readonly THINKING_PATTERN = /thinking|carameliz|processing|generating/i;
  private readonly DEBOUNCE_MS = 3000;

  async detect(): Promise<boolean> {
    return vscode.window.terminals.some((t) => this.isClaudeTerminal(t));
  }

  onThinkingStart(callback: () => void): void {
    this.thinkingStartCb = callback;
    this.startMonitoring();
  }

  onThinkingEnd(callback: () => void): void {
    this.thinkingEndCb = callback;
  }

  private isClaudeTerminal(terminal: vscode.Terminal): boolean {
    return terminal.name.toLowerCase().includes('claude');
  }

  private startMonitoring(): void {
    // Layer 1: Proposed onDidWriteTerminalData — best quality, direct terminal data
    this.tryProposedTerminalDataApi();

    // Layer 2: Shell execution streaming — stable API (VS Code 1.87+)
    // Captures output for new `claude` commands via execution.read()
    this.watchShellExecutions();

    // Layer 3: Terminal presence fallback — for already-running Claude sessions
    // where we missed the shell execution start event
    if (!this.hasStreamingSource) {
      this.startPresenceFallback();
    }
  }

  // ── Layer 1: Proposed onDidWriteTerminalData ──────────────────────────

  private tryProposedTerminalDataApi(): void {
    const win = vscode.window as typeof vscode.window & {
      onDidWriteTerminalData?: (
        listener: (e: { terminal: vscode.Terminal; data: string }) => void
      ) => vscode.Disposable;
    };

    if (typeof win.onDidWriteTerminalData === 'function') {
      this.hasStreamingSource = true;
      const listener = win.onDidWriteTerminalData((e) => {
        if (!this.isClaudeTerminal(e.terminal)) return;
        this.processTerminalData(e.data);
      });
      this.disposables.push(listener);
    }
  }

  // ── Layer 2: Shell execution streaming (stable) ───────────────────────

  private watchShellExecutions(): void {
    const startDisp = vscode.window.onDidStartTerminalShellExecution((e) => {
      if (!this.isClaudeTerminal(e.terminal)) return;
      this.hasStreamingSource = true;
      this.streamExecution(e.execution);
    });

    const endDisp = vscode.window.onDidEndTerminalShellExecution((e) => {
      if (!this.isClaudeTerminal(e.terminal)) return;
      this.streamingExecutions.delete(e.execution);
      // Claude process exited — end thinking if active
      if (this.isThinking && this.streamingExecutions.size === 0) {
        this.endThinking();
      }
    });

    this.disposables.push(startDisp, endDisp);
  }

  private async streamExecution(
    execution: vscode.TerminalShellExecution,
  ): Promise<void> {
    this.streamingExecutions.add(execution);
    try {
      for await (const data of execution.read()) {
        this.processTerminalData(data);
      }
    } catch {
      // Stream ended or errored
    } finally {
      this.streamingExecutions.delete(execution);
    }
  }

  // ── Layer 3: Terminal presence fallback ────────────────────────────────

  private startPresenceFallback(): void {
    // If Claude terminal already exists, show ad immediately
    const hasClaudeTerminal = vscode.window.terminals.some((t) =>
      this.isClaudeTerminal(t),
    );

    if (hasClaudeTerminal) {
      this.isThinking = true;
      this.thinkingStartCb?.();
    }

    // Poll: stop when terminal closes or a streaming source takes over
    const interval = setInterval(() => {
      if (this.hasStreamingSource) {
        clearInterval(interval);
        // Real detection takes over — end fallback-initiated thinking
        // so the stream-based logic controls state from here
        if (this.isThinking) {
          this.endThinking();
        }
        return;
      }

      const exists = vscode.window.terminals.some((t) =>
        this.isClaudeTerminal(t),
      );

      if (!exists && this.isThinking) {
        this.endThinking();
      } else if (exists && !this.isThinking) {
        this.isThinking = true;
        this.thinkingStartCb?.();
      }
    }, 2000);

    this.disposables.push({ dispose: () => clearInterval(interval) });
  }

  // ── Shared processing ─────────────────────────────────────────────────

  private processTerminalData(data: string): void {
    const hasSpinner = this.SPINNER_PATTERN.test(data);
    const hasThinking = this.THINKING_PATTERN.test(data);

    if (hasSpinner || hasThinking) {
      this.resetDebounce();

      if (!this.isThinking) {
        this.isThinking = true;
        this.thinkingStartCb?.();
      }
    }
  }

  private resetDebounce(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.endThinking();
      this.debounceTimer = null;
    }, this.DEBOUNCE_MS);
  }

  private endThinking(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.isThinking) {
      this.isThinking = false;
      this.thinkingEndCb?.();
    }
  }

  dispose(): void {
    this.endThinking();
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    this.thinkingStartCb = null;
    this.thinkingEndCb = null;
    this.streamingExecutions.clear();
  }
}
