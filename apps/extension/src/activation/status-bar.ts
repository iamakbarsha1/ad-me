import * as vscode from 'vscode';

export class StatusBarManager implements vscode.Disposable {
  private item: vscode.StatusBarItem;
  private currentPaise = 0;
  private adActive = false;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'ad-me.toggleAds';
  }

  show(): void {
    this.item.text = '$(pulse) ad-me: ₹0.00';
    this.item.tooltip = 'ad-me earnings today';
    this.item.show();
  }

  showUnauthenticated(): void {
    this.item.text = '$(pulse) ad-me: Sign in';
    this.item.tooltip = 'Click to sign in to ad-me';
    this.item.command = 'ad-me.login';
    this.item.show();
  }

  updateEarnings(paise: number): void {
    this.currentPaise = paise;
    if (!this.adActive) {
      const rupees = (paise / 100).toFixed(2);
      this.item.text = `$(pulse) ad-me: ₹${rupees}`;
      this.item.command = 'ad-me.toggleAds';
    }
  }

  showAd(title: string, adId: string, ctaUrl: string): void {
    this.adActive = true;
    this.item.text = `$(megaphone) ${title}`;
    this.item.tooltip = 'Sponsored - Click to learn more';
    this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    this.item.command = {
      command: 'ad-me.statusBarClick',
      title: 'Open Ad',
      arguments: [adId, ctaUrl],
    };
  }

  hideAd(): void {
    this.adActive = false;
    this.item.backgroundColor = undefined;
    this.item.tooltip = 'ad-me earnings today';
    this.item.command = 'ad-me.toggleAds';
    const rupees = (this.currentPaise / 100).toFixed(2);
    this.item.text = `$(pulse) ad-me: ₹${rupees}`;
  }

  dispose(): void {
    this.item.dispose();
  }
}
