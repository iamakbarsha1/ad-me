import * as vscode from 'vscode';
import type { AdServeResponse } from '@ad-me/shared';

export class ThinkingShimmerSurface implements vscode.Disposable {
  private item: vscode.StatusBarItem;
  private animationTimer: NodeJS.Timeout | null = null;
  private currentAd: AdServeResponse | null = null;
  private onClickCallback: ((adId: string, ctaUrl: string) => void) | null = null;
  private dotIndex = 0;
  private readonly DOT_FRAMES = ['.', '..', '...'];

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000);
  }

  show(ad: AdServeResponse): void {
    this.currentAd = ad;
    this.dotIndex = 0;

    this.item.command = {
      command: 'ad-me.shimmerClick',
      title: 'Open Ad',
      arguments: [ad.ad.id, ad.ad.ctaUrl],
    };
    this.item.tooltip = `Sponsored: ${ad.ad.title} — Click to learn more`;

    this.updateText();
    this.item.show();

    this.animationTimer = setInterval(() => {
      this.dotIndex = (this.dotIndex + 1) % this.DOT_FRAMES.length;
      this.updateText();
    }, 500);
  }

  hide(): void {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = null;
    }
    this.item.hide();
    this.currentAd = null;
  }

  onAdClick(callback: (adId: string, ctaUrl: string) => void): void {
    this.onClickCallback = callback;
  }

  handleClick(adId: string, ctaUrl: string): void {
    vscode.env.openExternal(vscode.Uri.parse(ctaUrl));
    this.onClickCallback?.(adId, ctaUrl);
  }

  private updateText(): void {
    if (!this.currentAd) {
      return;
    }
    const dots = this.DOT_FRAMES[this.dotIndex];
    this.item.text = `$(loading~spin) ${this.currentAd.ad.title}${dots}`;
  }

  dispose(): void {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = null;
    }
    this.item.dispose();
  }
}
