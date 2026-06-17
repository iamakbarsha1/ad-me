import * as vscode from 'vscode';
import type { AdServeResponse } from '@ad-me/shared';

export class StatusBarAdSurface implements vscode.Disposable {
  private item: vscode.StatusBarItem;
  private onClickCallback: ((adId: string, ctaUrl: string) => void) | null = null;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
  }

  show(ad: AdServeResponse): void {
    this.item.text = `$(megaphone) ${ad.ad.title}`;
    this.item.tooltip = 'Sponsored - Click to learn more';
    this.item.command = {
      command: 'vscode.open',
      title: 'Open',
      arguments: [vscode.Uri.parse(ad.ad.ctaUrl)],
    };
    this.item.show();
  }

  hide(): void {
    this.item.hide();
  }

  onAdClick(callback: (adId: string, ctaUrl: string) => void): void {
    this.onClickCallback = callback;
  }

  dispose(): void {
    this.item.dispose();
  }
}
