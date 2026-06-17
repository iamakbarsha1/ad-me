import * as vscode from 'vscode';

export class StatusBarAdSurface implements vscode.Disposable {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
  }

  show(ad: { title: string; ctaUrl: string }): void {
    this.item.text = `$(megaphone) ${ad.title}`;
    this.item.tooltip = 'Sponsored - Click to learn more';
    this.item.command = {
      command: 'vscode.open',
      title: 'Open',
      arguments: [vscode.Uri.parse(ad.ctaUrl)],
    };
    this.item.show();
  }

  hide(): void {
    this.item.hide();
  }

  dispose(): void {
    this.item.dispose();
  }
}
