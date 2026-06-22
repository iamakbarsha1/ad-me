import * as vscode from 'vscode';
import type { AIToolAdapter } from './types.js';
import type { AdServeResponse } from '@ad-me/shared';
import { locateClaudeCodeWebview, extractVersion } from './locate.js';
import { Patcher } from './patcher.js';

export class ClaudeCodeAdapter implements AIToolAdapter {
  readonly name = 'claude-code';

  private thinkingStartCb: (() => void) | null = null;
  private thinkingEndCb: (() => void) | null = null;
  private isThinking = false;
  private disposables: vscode.Disposable[] = [];
  private cycleTimer: NodeJS.Timeout | null = null;
  private claudeTerminalActive = false;

  private patcher: Patcher | null = null;
  private webviewPath: string | null = null;
  private ccVersion: string | null = null;

  // Ad cycle: show ad for AD_DURATION_MS, then pause for PAUSE_MS, repeat
  private readonly AD_DURATION_MS = 30_000;
  private readonly PAUSE_MS = 10_000;

  async detect(): Promise<boolean> {
    this.webviewPath = locateClaudeCodeWebview();
    if (this.webviewPath) {
      this.ccVersion = extractVersion(this.webviewPath);
      this.patcher = new Patcher(this.webviewPath);
      return this.patcher.isCompatible();
    }
    // Fallback: any terminal open (for status bar ads)
    return vscode.window.terminals.length > 0;
  }

  /** Patch Claude Code's webview with ad content. */
  patchWebview(ad: AdServeResponse): { ok: boolean; reason?: string } {
    if (!this.patcher) return { ok: false, reason: 'no patcher (CC not found)' };
    return this.patcher.applyPatch({
      adText: ad.ad.title,
      ctaUrl: ad.ad.ctaUrl,
      adId: ad.ad.id,
    });
  }

  /** Restore Claude Code's original webview. */
  restoreWebview(): { ok: boolean; restored: boolean; reason?: string } {
    if (!this.patcher) return { ok: true, restored: false, reason: 'no patcher' };
    return this.patcher.restore();
  }

  /** Check if webview is currently patched. */
  isPatchedNow(): boolean {
    return this.patcher?.isPatched() ?? false;
  }

  getVersion(): string | null {
    return this.ccVersion;
  }

  onThinkingStart(callback: () => void): void {
    this.thinkingStartCb = callback;
    this.startMonitoring();
  }

  onThinkingEnd(callback: () => void): void {
    this.thinkingEndCb = callback;
  }

  private startMonitoring(): void {
    const openDisp = vscode.window.onDidOpenTerminal(() => {
      this.onClaudeActive();
    });

    const closeDisp = vscode.window.onDidCloseTerminal((t) => {
      const stillActive = vscode.window.terminals.some(
        (term) => term !== t,
      );
      if (!stillActive) {
        this.onClaudeInactive();
      }
    });

    this.disposables.push(openDisp, closeDisp);

    if (vscode.window.terminals.length > 0) {
      this.onClaudeActive();
    }
  }

  private onClaudeActive(): void {
    if (this.claudeTerminalActive) return;
    this.claudeTerminalActive = true;
    this.startAdCycle();
  }

  private onClaudeInactive(): void {
    this.claudeTerminalActive = false;
    this.stopAdCycle();
    if (this.isThinking) {
      this.isThinking = false;
      this.thinkingEndCb?.();
    }
  }

  private startAdCycle(): void {
    this.isThinking = true;
    this.thinkingStartCb?.();
    this.scheduleNext();
  }

  private scheduleNext(): void {
    this.clearCycleTimer();
    this.cycleTimer = setTimeout(() => {
      if (!this.claudeTerminalActive) return;

      if (this.isThinking) {
        this.isThinking = false;
        this.thinkingEndCb?.();

        this.cycleTimer = setTimeout(() => {
          if (!this.claudeTerminalActive) return;
          this.isThinking = true;
          this.thinkingStartCb?.();
          this.scheduleNext();
        }, this.PAUSE_MS);
      }
    }, this.AD_DURATION_MS);
  }

  private stopAdCycle(): void {
    this.clearCycleTimer();
  }

  private clearCycleTimer(): void {
    if (this.cycleTimer) {
      clearTimeout(this.cycleTimer);
      this.cycleTimer = null;
    }
  }

  dispose(): void {
    this.onClaudeInactive();
    // Restore webview on deactivation
    this.restoreWebview();
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    this.thinkingStartCb = null;
    this.thinkingEndCb = null;
  }
}
