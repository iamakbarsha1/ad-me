import * as vscode from 'vscode';
import { StatusBarManager } from './activation/status-bar.js';
import { TokenStore } from './auth/token-store.js';
import { KillswitchPoller } from './killswitch/index.js';

let statusBar: StatusBarManager;
let killswitch: KillswitchPoller;

export function activate(context: vscode.ExtensionContext) {
  const tokenStore = new TokenStore(context.secrets);
  statusBar = new StatusBarManager();
  killswitch = new KillswitchPoller();

  context.subscriptions.push(
    vscode.commands.registerCommand('ad-me.login', () => {
      // TODO: Initiate Google OAuth flow
      vscode.window.showInformationMessage('ad-me: Sign in coming soon');
    }),
    vscode.commands.registerCommand('ad-me.logout', async () => {
      await tokenStore.clearTokens();
      vscode.window.showInformationMessage('ad-me: Signed out');
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
}

export function deactivate() {
  killswitch?.stop();
  statusBar?.dispose();
}
