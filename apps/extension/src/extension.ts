import * as vscode from 'vscode';
import { StatusBarManager } from './activation/status-bar.js';
import { TokenStore } from './auth/token-store.js';
import { ApiClient } from './api/client.js';
import { GoogleOAuthFlow } from './auth/google-oauth.js';
import { KillswitchPoller } from './killswitch/index.js';

let statusBar: StatusBarManager;
let killswitch: KillswitchPoller;

export function activate(context: vscode.ExtensionContext) {
  const tokenStore = new TokenStore(context.secrets);
  const apiClient = new ApiClient(tokenStore);
  const oauthFlow = new GoogleOAuthFlow(tokenStore, apiClient);
  statusBar = new StatusBarManager();
  killswitch = new KillswitchPoller();

  context.subscriptions.push(
    vscode.commands.registerCommand('ad-me.login', async () => {
      await oauthFlow.signIn();
      updateStatusBar(tokenStore);
    }),
    vscode.commands.registerCommand('ad-me.logout', async () => {
      await oauthFlow.signOut();
      updateStatusBar(tokenStore);
    }),
    vscode.commands.registerCommand('ad-me.toggleAds', () => {
      const config = vscode.workspace.getConfiguration('ad-me');
      const enabled = config.get<boolean>('enabled', true);
      config.update('enabled', !enabled, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`ad-me: Ads ${!enabled ? 'enabled' : 'disabled'}`);
    }),
    statusBar,
  );

  killswitch.start();
  statusBar.show();

  updateStatusBar(tokenStore);
}

async function updateStatusBar(tokenStore: TokenStore): Promise<void> {
  const isAuth = await tokenStore.isAuthenticated();
  if (!isAuth) {
    statusBar.showUnauthenticated();
  }
}

export function deactivate() {
  killswitch?.stop();
  statusBar?.dispose();
}
