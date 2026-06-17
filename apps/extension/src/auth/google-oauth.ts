import * as vscode from 'vscode';
import { TokenStore } from './token-store.js';

export class GoogleOAuthFlow {
  constructor(private tokenStore: TokenStore) {}

  async signIn(): Promise<boolean> {
    // TODO: Use vscode.authentication.getSession or manual OAuth flow
    // 1. Open browser to Google OAuth consent screen
    // 2. Handle redirect URI callback
    // 3. Exchange code for tokens via backend /auth/google
    // 4. Store JWT tokens in SecretStorage
    vscode.window.showInformationMessage('ad-me: Google sign-in not yet implemented');
    return false;
  }

  async signOut(): Promise<void> {
    await this.tokenStore.clearTokens();
  }
}
