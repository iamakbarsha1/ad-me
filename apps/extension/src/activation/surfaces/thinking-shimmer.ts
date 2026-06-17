import * as vscode from 'vscode';

export class ThinkingShimmerSurface implements vscode.Disposable {
  // TODO: Decorations or webview that shows ad during shimmer/loading state

  show(_ad: { title: string; body: string }): void {
    // TODO: Show shimmer ad
  }

  hide(): void {
    // TODO: Hide shimmer ad
  }

  dispose(): void {}
}
