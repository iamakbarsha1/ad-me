import * as vscode from 'vscode';

export class SpinnerOverlaySurface implements vscode.Disposable {
  // TODO: WebviewView that overlays spinner area with ad content

  show(_ad: { title: string; body: string; imageUrl: string | null }): void {
    // TODO: Create or show webview overlay
  }

  hide(): void {
    // TODO: Hide webview overlay
  }

  dispose(): void {}
}
