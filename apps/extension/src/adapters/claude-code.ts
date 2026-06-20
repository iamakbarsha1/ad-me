import * as vscode from 'vscode';
import type { AIToolAdapter } from './types.js';

export class ClaudeCodeAdapter implements AIToolAdapter {
  readonly name = 'claude-code';

  private thinkingStartCb: (() => void) | null = null;
  private thinkingEndCb: (() => void) | null = null;
  private isThinking = false;
  private endTimer: NodeJS.Timeout | null = null;
  private disposables: vscode.Disposable[] = [];
  private activeExecutions = 0;

  // How long after last execution ends before we consider thinking done
  private readonly END_DELAY_MS = 2000;

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
    // Shell execution events — detect when Claude runs commands
    const startDisp = vscode.window.onDidStartTerminalShellExecution((e) => {
      if (!this.isClaudeTerminal(e.terminal)) return;
      this.activeExecutions++;
      this.cancelEndTimer();
      if (!this.isThinking) {
        this.isThinking = true;
        this.thinkingStartCb?.();
      }
    });

    const endDisp = vscode.window.onDidEndTerminalShellExecution((e) => {
      if (!this.isClaudeTerminal(e.terminal)) return;
      this.activeExecutions = Math.max(0, this.activeExecutions - 1);
      if (this.activeExecutions === 0) {
        this.scheduleEnd();
      }
    });

    // Terminal lifecycle — detect Claude terminal open/close
    const openDisp = vscode.window.onDidOpenTerminal((t) => {
      if (!this.isClaudeTerminal(t)) return;
      if (!this.isThinking) {
        this.isThinking = true;
        this.thinkingStartCb?.();
      }
    });

    const closeDisp = vscode.window.onDidCloseTerminal((t) => {
      if (!this.isClaudeTerminal(t)) return;
      this.endThinking();
    });

    this.disposables.push(startDisp, endDisp, openDisp, closeDisp);

    // If Claude terminal already exists, start immediately
    if (vscode.window.terminals.some((t) => this.isClaudeTerminal(t))) {
      this.isThinking = true;
      this.thinkingStartCb?.();
    }
  }

  private scheduleEnd(): void {
    this.cancelEndTimer();
    this.endTimer = setTimeout(() => {
      this.endTimer = null;
      // Only end if no new executions started
      if (this.activeExecutions === 0) {
        this.endThinking();
      }
    }, this.END_DELAY_MS);
  }

  private cancelEndTimer(): void {
    if (this.endTimer) {
      clearTimeout(this.endTimer);
      this.endTimer = null;
    }
  }

  private endThinking(): void {
    this.cancelEndTimer();
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
  }
}
