import * as vscode from 'vscode';

export class SpinnerVerbSurface implements vscode.Disposable {
  // TODO: Replace or augment the spinner verb text with ad content

  show(_ad: { title: string }): void {
    // TODO: Show verb ad (e.g., "Thinking... powered by BrandX")
  }

  hide(): void {
    // TODO: Restore original verb
  }

  dispose(): void {}
}
