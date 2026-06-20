import * as vscode from 'vscode';
import { AD_SURFACES } from '@ad-me/shared';
import type { AdServeResponse, AdSurface } from '@ad-me/shared';
import { StatusBarManager } from './activation/status-bar.js';
import { TokenStore } from './auth/token-store.js';
import { ApiClient } from './api/client.js';
import { AdService } from './api/ad-service.js';
import { TelemetryClient } from './api/telemetry.js';
import { GoogleOAuthFlow } from './auth/google-oauth.js';
import { KillswitchPoller } from './killswitch/index.js';
import { LifecycleManager } from './activation/lifecycle.js';
import { ImpressionTracker } from './metrics/impression-tracker.js';
import { ClickTracker } from './metrics/click-tracker.js';
import { SpinnerOverlaySurface } from './activation/surfaces/spinner-overlay.js';
import { ThinkingShimmerSurface } from './activation/surfaces/thinking-shimmer.js';
import { StatusBarAdSurface } from './activation/surfaces/status-bar-ad.js';
import { SpinnerVerbSurface } from './activation/surfaces/spinner-verb.js';
import { ClaudeCodeAdapter } from './adapters/claude-code.js';
import type { AIToolAdapter } from './adapters/types.js';

let statusBar: StatusBarManager;
let killswitch: KillswitchPoller;
let lifecycle: LifecycleManager;
let impressionTracker: ImpressionTracker;

// Debug output channel
const log = vscode.window.createOutputChannel('ad-me', { log: true });

// Surface mapping: adapter name -> preferred surface type
const ADAPTER_SURFACE_MAP: Record<string, AdSurface> = {
  'claude-code': 'status_bar',
  'copilot': 'thinking_shimmer',
  'codex-cli': 'spinner_verb',
};

export function activate(context: vscode.ExtensionContext) {
  log.info('ad-me extension activating...');
  const tokenStore = new TokenStore(context.secrets);
  const apiClient = new ApiClient(tokenStore);
  const oauthFlow = new GoogleOAuthFlow(tokenStore, apiClient);
  const adService = new AdService(apiClient);
  const telemetry = new TelemetryClient(apiClient);

  statusBar = new StatusBarManager();
  killswitch = new KillswitchPoller(apiClient);
  lifecycle = new LifecycleManager();
  impressionTracker = new ImpressionTracker();
  const clickTracker = new ClickTracker();

  // Create surfaces
  const spinnerOverlay = new SpinnerOverlaySurface();
  const thinkingShimmer = new ThinkingShimmerSurface();
  const statusBarAd = new StatusBarAdSurface();
  const spinnerVerb = new SpinnerVerbSurface();

  // Surface lookup by AdSurface type
  const surfaces: Record<AdSurface, { show: (ad: AdServeResponse) => void; hide: () => void }> = {
    spinner_overlay: spinnerOverlay,
    thinking_shimmer: thinkingShimmer,
    status_bar: statusBarAd,
    spinner_verb: spinnerVerb,
  };

  // Track active impressions per adapter
  const activeImpressions = new Map<string, { adId: string; blockId: string; trackingKey: string; impressionId?: string; idempotencyKey: string; surface: AdSurface }>();

  // Wire click handlers
  clickTracker.onAdClick((adId, impressionId: string) => {
    if (!impressionId) return; // No server-confirmed impressionId yet
    const idempotencyKey = crypto.randomUUID();
    telemetry.reportClick({ impressionId, adId, idempotencyKey }).catch(() => {
      // Silently fail click reporting
    });
  });

  spinnerOverlay.onAdClick((adId, ctaUrl) => {
    const active = findActiveImpressionByAd(adId);
    if (active) {
      clickTracker.handleClick(adId, active.impressionId ?? '', ctaUrl);
    } else {
      vscode.env.openExternal(vscode.Uri.parse(ctaUrl));
    }
  });

  thinkingShimmer.onAdClick((adId, ctaUrl) => {
    const active = findActiveImpressionByAd(adId);
    if (active) {
      clickTracker.handleClick(adId, active.impressionId ?? '', ctaUrl);
    } else {
      vscode.env.openExternal(vscode.Uri.parse(ctaUrl));
    }
  });

  spinnerVerb.onAdClick((adId, ctaUrl) => {
    const active = findActiveImpressionByAd(adId);
    if (active) {
      clickTracker.handleClick(adId, active.impressionId ?? '', ctaUrl);
    } else {
      vscode.env.openExternal(vscode.Uri.parse(ctaUrl));
    }
  });

  statusBarAd.onAdClick((adId, ctaUrl) => {
    const active = findActiveImpressionByAd(adId);
    if (active) {
      clickTracker.handleClick(adId, active.impressionId ?? '', ctaUrl);
    } else {
      vscode.env.openExternal(vscode.Uri.parse(ctaUrl));
    }
  });

  function findActiveImpressionByAd(adId: string) {
    for (const [, imp] of activeImpressions) {
      if (imp.adId === adId) return imp;
    }
    return null;
  }

  function hideAllSurfaces(): void {
    spinnerOverlay.hide();
    thinkingShimmer.hide();
    statusBarAd.hide();
    spinnerVerb.hide();
  }

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('ad-me.login', async () => {
      log.info('Sign-in initiated');
      const ok = await oauthFlow.signIn();
      log.info(`Sign-in result: ${ok}`);
      updateStatusBar(tokenStore);
    }),
    vscode.commands.registerCommand('ad-me.logout', async () => {
      await oauthFlow.signOut();
      log.info('Signed out');
      updateStatusBar(tokenStore);
    }),
    vscode.commands.registerCommand('ad-me.toggleAds', () => {
      const config = vscode.workspace.getConfiguration('ad-me');
      const enabled = config.get<boolean>('enabled', true);
      config.update('enabled', !enabled, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`ad-me: Ads ${!enabled ? 'enabled' : 'disabled'}`);
    }),
    vscode.commands.registerCommand('ad-me.shimmerClick', (adId: string, ctaUrl: string) => {
      thinkingShimmer.handleClick(adId, ctaUrl);
    }),
    vscode.commands.registerCommand('ad-me.verbClick', (adId: string, ctaUrl: string) => {
      spinnerVerb.handleClick(adId, ctaUrl);
    }),
    vscode.commands.registerCommand('ad-me.statusBarClick', (adId: string, ctaUrl: string) => {
      statusBarAd.handleClick(adId, ctaUrl);
    }),
    vscode.commands.registerCommand('ad-me.testFetch', async () => {
      log.show();
      const isAuth = await tokenStore.isAuthenticated();
      log.info(`Auth: ${isAuth}`);
      const token = await tokenStore.getAccessToken();
      log.info(`Token present: ${!!token}, length: ${token?.length ?? 0}`);
      try {
        const ad = await adService.fetchNext('status_bar');
        if (ad) {
          log.info(`Ad fetched: "${ad.ad.title}" (${ad.ad.id})`);
          vscode.window.showInformationMessage(`ad-me: Got ad "${ad.ad.title}"`);
        } else {
          log.warn('No ad returned (null)');
          vscode.window.showWarningMessage('ad-me: No ad returned from API');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error(`Fetch failed: ${msg}`);
        vscode.window.showErrorMessage(`ad-me: ${msg}`);
      }
    }),
  );

  // Register webview provider for spinner overlay
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SpinnerOverlaySurface.viewType, spinnerOverlay),
  );

  // Push disposables
  context.subscriptions.push(
    statusBar,
    spinnerOverlay,
    thinkingShimmer,
    statusBarAd,
    spinnerVerb,
  );

  // Start killswitch polling
  killswitch.start();
  killswitch.onKillswitchChange((killed) => {
    if (killed) {
      hideAllSurfaces();
    }
  });

  statusBar.show();
  updateStatusBar(tokenStore);

  // Prefetch ads for all surfaces
  tokenStore.isAuthenticated().then(auth => log.info(`Auth status at activation: ${auth}`));
  adService.prefetch([...AD_SURFACES]).then(() => {
    log.info('Prefetch complete');
  }).catch((err) => {
    log.warn(`Prefetch failed: ${err instanceof Error ? err.message : err}`);
  });

  // Track wired adapters to prevent double-wiring
  const wiredAdapterNames = new Set<string>();

  function wireAdapter(adapter: AIToolAdapter): void {
    if (wiredAdapterNames.has(adapter.name)) return;
    wiredAdapterNames.add(adapter.name);

    const surfaceType = ADAPTER_SURFACE_MAP[adapter.name] ?? 'status_bar';
    const surface = surfaces[surfaceType];

    adapter.onThinkingStart(async () => {
      log.info(`[${adapter.name}] thinkingStart fired, surface=${surfaceType}`);
      if (killswitch.isKilled) { log.warn('Killswitch active, skipping'); return; }

      const config = vscode.workspace.getConfiguration('ad-me');
      if (!config.get<boolean>('enabled', true)) { log.warn('Ads disabled in config'); return; }

      let ad = adService.getCached(surfaceType);
      log.info(`Cached ad: ${ad ? ad.ad.title : 'null'}`);
      if (!ad) {
        try {
          ad = await adService.fetchNext(surfaceType);
          log.info(`Fetched ad: ${ad ? ad.ad.title : 'null'}`);
        } catch (err) {
          log.error(`Ad fetch error: ${err instanceof Error ? err.message : err}`);
        }
      }
      if (!ad) { log.warn('No ad available, skipping display'); return; }

      const idempotencyKey = crypto.randomUUID();

      const trackingKey = crypto.randomUUID();

      // Store active impression
      activeImpressions.set(adapter.name, {
        adId: ad.ad.id,
        blockId: ad.blockId,
        trackingKey,
        idempotencyKey,
        surface: surfaceType,
      });

      // Show the ad surface
      surface.show(ad);

      // Start impression tracking
      impressionTracker.startTracking(trackingKey, (durationMs) => {
        telemetry.reportImpression({
          adId: ad.ad.id,
          blockId: ad.blockId,
          idempotencyKey,
          surface: surfaceType,
          durationMs,
        }).then((result) => {
          // Store real impressionId from server for click tracking
          const active = activeImpressions.get(adapter.name);
          if (active && active.trackingKey === trackingKey) {
            active.impressionId = result.id;
          }
        }).catch(() => {});
      });

      // Pre-fetch next ad for this surface
      adService.fetchNext(surfaceType).catch(() => {});
    });

    adapter.onThinkingEnd(() => {
      const active = activeImpressions.get(adapter.name);
      if (active) {
        impressionTracker.cancelTracking(active.trackingKey);
        activeImpressions.delete(adapter.name);
      }

      hideAllSurfaces();
    });
  }

  // Initialize lifecycle and wire adapters
  lifecycle.initialize().then(() => {
    const active = lifecycle.getActiveAdapters();
    log.info(`Lifecycle init: ${active.length} adapter(s) detected: ${active.map(a => a.name).join(', ') || 'none'}`);
    for (const adapter of active) {
      wireAdapter(adapter);
    }

    // Late terminal detection: wire claude-code adapter if terminal opens after activation
    context.subscriptions.push(
      vscode.window.onDidOpenTerminal(async (terminal) => {
        log.info(`Terminal opened: "${terminal.name}"`);
        if (!terminal.name.toLowerCase().includes('claude')) return;
        if (wiredAdapterNames.has('claude-code')) { log.info('claude-code adapter already wired'); return; }
        const adapter = new ClaudeCodeAdapter();
        if (await adapter.detect()) {
          log.info('Late-detected Claude terminal, wiring adapter');
          wireAdapter(adapter);
          context.subscriptions.push(adapter);
        }
      })
    );
  }).catch((err) => {
    log.error(`Lifecycle init failed: ${err instanceof Error ? err.message : err}`);
  });
}

async function updateStatusBar(tokenStore: TokenStore): Promise<void> {
  const isAuth = await tokenStore.isAuthenticated();
  if (!isAuth) {
    statusBar.showUnauthenticated();
  }
}

export function deactivate() {
  killswitch?.stop();
  lifecycle?.dispose();
  impressionTracker?.dispose();
  statusBar?.dispose();
}
