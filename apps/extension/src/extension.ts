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

// Surface mapping: adapter name -> preferred surface type
const ADAPTER_SURFACE_MAP: Record<string, AdSurface> = {
  'claude-code': 'status_bar',
  'copilot': 'thinking_shimmer',
  'codex-cli': 'spinner_verb',
};

export function activate(context: vscode.ExtensionContext) {
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
    vscode.commands.registerCommand('ad-me.shimmerClick', (adId: string, ctaUrl: string) => {
      thinkingShimmer.handleClick(adId, ctaUrl);
    }),
    vscode.commands.registerCommand('ad-me.verbClick', (adId: string, ctaUrl: string) => {
      spinnerVerb.handleClick(adId, ctaUrl);
    }),
    vscode.commands.registerCommand('ad-me.statusBarClick', (adId: string, ctaUrl: string) => {
      statusBarAd.handleClick(adId, ctaUrl);
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
  adService.prefetch([...AD_SURFACES]).catch(() => {
    // Silently fail prefetch
  });

  // Track wired adapters to prevent double-wiring
  const wiredAdapterNames = new Set<string>();

  function wireAdapter(adapter: AIToolAdapter): void {
    if (wiredAdapterNames.has(adapter.name)) return;
    wiredAdapterNames.add(adapter.name);

    const surfaceType = ADAPTER_SURFACE_MAP[adapter.name] ?? 'status_bar';
    const surface = surfaces[surfaceType];

    adapter.onThinkingStart(() => {
      if (killswitch.isKilled) return;

      const config = vscode.workspace.getConfiguration('ad-me');
      if (!config.get<boolean>('enabled', true)) return;

      const ad = adService.getCached(surfaceType);
      if (!ad) return;

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
    for (const adapter of lifecycle.getActiveAdapters()) {
      wireAdapter(adapter);
    }

    // Late terminal detection: wire claude-code adapter if terminal opens after activation
    context.subscriptions.push(
      vscode.window.onDidOpenTerminal(async (terminal) => {
        if (!terminal.name.toLowerCase().includes('claude')) return;
        if (wiredAdapterNames.has('claude-code')) return;
        const adapter = new ClaudeCodeAdapter();
        if (await adapter.detect()) {
          wireAdapter(adapter);
          context.subscriptions.push(adapter);
        }
      })
    );
  }).catch(() => {
    // Silently fail adapter initialization
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
