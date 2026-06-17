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
        prompt: 'Paste your Google ID token (from ad-me web login)',
        placeHolder: 'eyJhbGciOiJSUzI1NiIs...',
        password: true,
        ignoreFocusOut: true,
      });

      if (!token) return false;

      const response = await this.apiClient.fetchUnauth<{
        user: { id: string; name: string; email: string };
        accessToken: string;
        refreshToken: string;
      }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });

      await this.tokenStore.setTokens(response.accessToken, response.refreshToken);
      vscode.window.showInformationMessage(`ad-me: Signed in as ${response.user.name}`);
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
