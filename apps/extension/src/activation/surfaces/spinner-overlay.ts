import * as vscode from 'vscode';
import type { AdServeResponse } from '@ad-me/shared';

export class SpinnerOverlaySurface implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly viewType = 'ad-me.spinnerOverlay';

  private view?: vscode.WebviewView;
  private currentAd: AdServeResponse | null = null;
  private onClickCallback: ((adId: string, ctaUrl: string) => void) | null = null;
  private disposables: vscode.Disposable[] = [];

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.onDidReceiveMessage(
      (message: { type: string; adId?: string; ctaUrl?: string }) => {
        if (message.type === 'click' && message.adId && message.ctaUrl) {
          this.onClickCallback?.(message.adId, message.ctaUrl);
        }
      },
      undefined,
      this.disposables
    );

    // Show empty state initially
    this.renderEmpty();
  }

  show(ad: AdServeResponse): void {
    this.currentAd = ad;
    if (!this.view) {
      return;
    }

    this.view.show?.(true); // Reveal panel tab, keep focus in terminal
    this.view.webview.html = this.buildAdHtml(ad);
  }

  hide(): void {
    this.currentAd = null;
    this.renderEmpty();
  }

  onAdClick(callback: (adId: string, ctaUrl: string) => void): void {
    this.onClickCallback = callback;
  }

  private renderEmpty(): void {
    if (!this.view) {
      return;
    }
    this.view.webview.html = `<!DOCTYPE html>
<html><body style="margin:0;padding:8px;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background);">
<p style="opacity:0.5;font-size:12px;text-align:center;">No ad to display</p>
</body></html>`;
  }

  private buildAdHtml(ad: AdServeResponse): string {
    const { id, title, body, ctaText, ctaUrl, imageUrl } = ad.ad;
    const imageTag = imageUrl
      ? `<img src="${this.escapeHtml(imageUrl)}" alt="${this.escapeHtml(title)}" style="width:100%;max-height:120px;object-fit:cover;border-radius:4px;margin-bottom:8px;" />`
      : '';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  body {
    margin: 0;
    padding: 10px;
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
  }
  .sponsored {
    font-size: 10px;
    opacity: 0.6;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .body-text {
    font-size: 12px;
    opacity: 0.8;
    margin-bottom: 10px;
    line-height: 1.4;
  }
  .cta-btn {
    display: inline-block;
    padding: 6px 14px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    text-decoration: none;
  }
  .cta-btn:hover {
    background: var(--vscode-button-hoverBackground);
  }
</style>
</head>
<body>
  <div class="sponsored">Sponsored</div>
  ${imageTag}
  <div class="title">${this.escapeHtml(title)}</div>
  <div class="body-text">${this.escapeHtml(body)}</div>
  <button class="cta-btn" onclick="handleClick()">${this.escapeHtml(ctaText)}</button>
  <script>
    const vscode = acquireVsCodeApi();
    function handleClick() {
      vscode.postMessage({
        type: 'click',
        adId: '${this.escapeJs(id)}',
        ctaUrl: '${this.escapeJs(ctaUrl)}'
      });
    }
  </script>
</body>
</html>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeJs(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    this.currentAd = null;
    this.view = undefined;
  }
}
