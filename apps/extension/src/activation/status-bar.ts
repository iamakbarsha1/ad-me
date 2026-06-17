import * as vscode from 'vscode';

export class StatusBarManager implements vscode.Disposable {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'ad-me.toggleAds';
  }

  show(): void {
    this.item.text = '$(pulse) ad-me: ₹0.00';
    this.item.tooltip = 'ad-me earnings today';
    this.item.show();
  }

  updateEarnings(paise: number): void {
    const rupees = (paise / 100).toFixed(2);
    this.item.text = `$(pulse) ad-me: ₹${rupees}`;
  }

  dispose(): void {
    this.item.dispose();
  }
}
