import * as vscode from 'vscode';
import { TokenStore } from './token-store.js';
import { ApiClient } from '../api/client.js';

export class GoogleOAuthFlow {
  constructor(
    private tokenStore: TokenStore,
    private apiClient: ApiClient,
  ) {}

  async signIn(): Promise<boolean> {
    try {
      const token = await vscode.window.showInputBox({
        prompt: 'Paste your ad-me access token (Settings → Extension Token on ad-me web app)',
        placeHolder: 'eyJhbGciOiJIUzI1NiIs...',
        password: true,
        ignoreFocusOut: true,
      });

      if (!token) return false;

      const user = await this.apiClient.fetchUnauth<{
        id: string;
        name: string;
        email: string;
      }>('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      await this.tokenStore.setTokens(token, '');
      vscode.window.showInformationMessage(`ad-me: Signed in as ${user.name}`);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      vscode.window.showErrorMessage(`ad-me: ${message}`);
      return false;
    }
  }

  async signOut(): Promise<void> {
    await this.tokenStore.clearTokens();
    vscode.window.showInformationMessage('ad-me: Signed out');
  }

  async tryRefresh(): Promise<boolean> {
    try {
      const refreshToken = await this.tokenStore.getRefreshToken();
      if (!refreshToken) return false;

      const response = await this.apiClient.fetchUnauth<{
        accessToken: string;
        refreshToken: string;
      }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });

      await this.tokenStore.setTokens(response.accessToken, response.refreshToken);
      return true;
    } catch {
      return false;
    }
  }
}
