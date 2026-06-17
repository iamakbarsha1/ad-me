import * as vscode from 'vscode';

export class ClickTracker {
  private onClickCallback: ((adId: string, impressionId: string) => void) | null = null;

  onAdClick(callback: (adId: string, impressionId: string) => void): void {
    this.onClickCallback = callback;
  }

  handleClick(adId: string, impressionId: string, ctaUrl: string): void {
    vscode.env.openExternal(vscode.Uri.parse(ctaUrl));
    this.onClickCallback?.(adId, impressionId);
  }
}
