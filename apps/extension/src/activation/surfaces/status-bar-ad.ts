import * as vscode from 'vscode';
import type { AdServeResponse } from '@ad-me/shared';
import type { StatusBarManager } from '../status-bar.js';

export class StatusBarAdSurface implements vscode.Disposable {
  private statusBar: StatusBarManager;
  private onClickCallback: ((adId: string, ctaUrl: string) => void) | null = null;

  constructor(statusBar: StatusBarManager) {
    this.statusBar = statusBar;
  }

  show(ad: AdServeResponse): void {
    this.statusBar.showAd(ad.ad.title, ad.ad.id, ad.ad.ctaUrl);
  }

  handleClick(adId: string, ctaUrl: string): void {
    vscode.env.openExternal(vscode.Uri.parse(ctaUrl));
    this.onClickCallback?.(adId, ctaUrl);
  }

  hide(): void {
    this.statusBar.hideAd();
  }

  onAdClick(callback: (adId: string, ctaUrl: string) => void): void {
    this.onClickCallback = callback;
  }

  dispose(): void {
    // StatusBarManager owns the item, nothing to dispose here
  }
}
