import * as vscode from 'vscode';

const ACCESS_TOKEN_KEY = 'ad-me.accessToken';
const REFRESH_TOKEN_KEY = 'ad-me.refreshToken';

export class TokenStore {
  constructor(private secrets: vscode.SecretStorage) {}

  async getAccessToken(): Promise<string | undefined> {
    return this.secrets.get(ACCESS_TOKEN_KEY);
  }

  async getRefreshToken(): Promise<string | undefined> {
    return this.secrets.get(REFRESH_TOKEN_KEY);
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await this.secrets.store(ACCESS_TOKEN_KEY, accessToken);
    await this.secrets.store(REFRESH_TOKEN_KEY, refreshToken);
  }

  async clearTokens(): Promise<void> {
    await this.secrets.delete(ACCESS_TOKEN_KEY);
    await this.secrets.delete(REFRESH_TOKEN_KEY);
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== undefined;
  }
}
