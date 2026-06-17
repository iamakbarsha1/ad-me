import * as vscode from 'vscode';
import type { AdServeResponse } from '@ad-me/shared';

export class SpinnerVerbSurface implements vscode.Disposable {
  private item: vscode.StatusBarItem;
  private currentAd: AdServeResponse | null = null;
  private onClickCallback: ((adId: string, ctaUrl: string) => void) | null = null;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 999);
  }

  show(ad: AdServeResponse): void {
    this.currentAd = ad;
    this.item.text = `$(loading~spin) Thinking... powered by ${ad.ad.title}`;
    this.item.tooltip = `Sponsored: ${ad.ad.title} — Click to learn more`;
    this.item.command = {
      command: 'ad-me.verbClick',
      title: 'Open Ad',
      arguments: [ad.ad.id, ad.ad.ctaUrl],
    };
    this.item.show();
  }

  hide(): void {
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

  dispose(): void {
    this.item.dispose();
  }
}
