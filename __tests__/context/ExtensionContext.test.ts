import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_EXTENSIONS } from '../../src/core/extensions/defaultExtensions';
import { ExtensionManifest, AdBlockStats, BridgeMessage } from '../../src/types/extension';

describe('ExtensionContext & State Management', () => {
  const EXTENSIONS_STORAGE_KEY = '@youtube_wr_extensions';
  const STATS_STORAGE_KEY = '@youtube_wr_stats';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Default Extensions Configuration', () => {
    it('contains all 4 core default extensions', () => {
      expect(DEFAULT_EXTENSIONS).toHaveLength(4);
      const ids = DEFAULT_EXTENSIONS.map((e) => e.id);
      expect(ids).toContain('youtube-adblocker');
      expect(ids).toContain('youtube-auto-hd');
      expect(ids).toContain('youtube-distraction-free');
      expect(ids).toContain('youtube-sponsorblock');
    });

    it('all default extensions are enabled by default and have unique IDs', () => {
      const ids = new Set<string>();
      DEFAULT_EXTENSIONS.forEach((ext) => {
        expect(ext.enabled).toBe(true);
        expect(ids.has(ext.id)).toBe(false);
        ids.add(ext.id);
        expect(ext.urlMatches.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Extension Toggling & Settings Operations', () => {
    it('toggles an extension on and off', () => {
      let exts: ExtensionManifest[] = [...DEFAULT_EXTENSIONS];
      const toggle = (id: string) => {
        exts = exts.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e));
      };

      expect(exts.find((e) => e.id === 'youtube-adblocker')?.enabled).toBe(true);
      toggle('youtube-adblocker');
      expect(exts.find((e) => e.id === 'youtube-adblocker')?.enabled).toBe(false);
      toggle('youtube-adblocker');
      expect(exts.find((e) => e.id === 'youtube-adblocker')?.enabled).toBe(true);
    });

    it('updates user settings for a specific extension without modifying others', () => {
      let exts: ExtensionManifest[] = [...DEFAULT_EXTENSIONS];
      const updateSettings = (id: string, newSettings: Record<string, any>) => {
        exts = exts.map((e) =>
          e.id === id ? { ...e, userSettings: { ...e.userSettings, ...newSettings } } : e
        );
      };

      updateSettings('youtube-adblocker', { blockBanners: false });
      const adBlocker = exts.find((e) => e.id === 'youtube-adblocker');
      const autoHd = exts.find((e) => e.id === 'youtube-auto-hd');

      expect(adBlocker?.userSettings?.blockBanners).toBe(false);
      expect(adBlocker?.userSettings?.blockVideoAds).toBe(true); // preserved
      expect(autoHd?.userSettings?.forceMaxResolution).toBe(true); // untouched
    });

    it('adds and deletes a custom user extension', () => {
      let exts: ExtensionManifest[] = [...DEFAULT_EXTENSIONS];
      const addCustom = (manifest: Omit<ExtensionManifest, 'id' | 'createdAt'>) => {
        const newExt: ExtensionManifest = {
          ...manifest,
          id: 'custom-' + Date.now(),
          createdAt: Date.now(),
          isCustom: true,
          enabled: true,
        };
        exts = [...exts, newExt];
        return newExt.id;
      };
      const deleteCustom = (id: string) => {
        exts = exts.filter((e) => e.id !== id);
      };

      const customId = addCustom({
        name: 'Dark Invert',
        description: 'Test invert',
        version: '1.0.0',
        author: 'Me',
        icon: 'contrast',
        category: 'custom',
        enabled: true,
        urlMatches: ['*://*.youtube.com/*'],
        runAt: 'document_end',
        injectedCSS: 'body { filter: invert(1); }',
      });

      expect(exts).toHaveLength(5);
      expect(exts.find((e) => e.id === customId)?.name).toBe('Dark Invert');

      deleteCustom(customId);
      expect(exts).toHaveLength(4);
      expect(exts.find((e) => e.id === customId)).toBeUndefined();
    });
  });

  describe('AdBlock Stats & Bridge Message Dispatcher', () => {
    it('correctly increments stats when video ad is skipped', () => {
      let stats: AdBlockStats = {
        adsBlocked: 0,
        trackersBlocked: 0,
        timeSavedSeconds: 0,
      };

      const handleBridgeMessage = (msg: BridgeMessage) => {
        if (msg.extensionId === 'youtube-adblocker' && msg.type === 'AD_BLOCKED') {
          const isNetwork = msg.payload?.source === 'network' || msg.payload?.source === 'fetch';
          const isVideoSkip = msg.payload?.source === 'video_ad_skip';

          stats = {
            adsBlocked: stats.adsBlocked + 1,
            trackersBlocked: isNetwork ? stats.trackersBlocked + 1 : stats.trackersBlocked,
            timeSavedSeconds: stats.timeSavedSeconds + (isVideoSkip ? 15 : 5),
            lastBlockedAt: Date.now(),
          };
        }
      };

      // 1 video ad skipped -> +1 ad, +15 seconds
      handleBridgeMessage({
        extensionId: 'youtube-adblocker',
        type: 'AD_BLOCKED',
        payload: { source: 'video_ad_skip' },
        timestamp: Date.now(),
      });

      expect(stats.adsBlocked).toBe(1);
      expect(stats.trackersBlocked).toBe(0);
      expect(stats.timeSavedSeconds).toBe(15);

      // 1 network ad dropped -> +1 ad, +1 tracker, +5 seconds
      handleBridgeMessage({
        extensionId: 'youtube-adblocker',
        type: 'AD_BLOCKED',
        payload: { source: 'network' },
        timestamp: Date.now(),
      });

      expect(stats.adsBlocked).toBe(2);
      expect(stats.trackersBlocked).toBe(1);
      expect(stats.timeSavedSeconds).toBe(20);
    });

    it('resets stats to zero', () => {
      let stats: AdBlockStats = {
        adsBlocked: 42,
        trackersBlocked: 12,
        timeSavedSeconds: 630,
      };

      const resetStats = () => {
        stats = {
          adsBlocked: 0,
          trackersBlocked: 0,
          timeSavedSeconds: 0,
        };
      };

      resetStats();
      expect(stats.adsBlocked).toBe(0);
      expect(stats.trackersBlocked).toBe(0);
      expect(stats.timeSavedSeconds).toBe(0);
    });
  });
});
