import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExtensionManifest, AdBlockStats, BridgeMessage } from '../types/extension';
import { DEFAULT_EXTENSIONS } from '../core/extensions/defaultExtensions';
import { triggerNotificationHaptic } from '../utils/haptics';

interface ExtensionContextType {
  extensions: ExtensionManifest[];
  stats: AdBlockStats;
  toggleExtension: (id: string) => void;
  updateExtensionSettings: (id: string, newSettings: Record<string, any>) => void;
  addCustomExtension: (manifest: Omit<ExtensionManifest, 'id' | 'createdAt'>) => void;
  deleteCustomExtension: (id: string) => void;
  resetStats: () => void;
  handleBridgeMessage: (msg: BridgeMessage) => void;
}

const EXTENSIONS_STORAGE_KEY = '@youtube_wr_extensions';
const STATS_STORAGE_KEY = '@youtube_wr_stats';

const ExtensionContext = createContext<ExtensionContextType | undefined>(undefined);

export const ExtensionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [extensions, setExtensions] = useState<ExtensionManifest[]>(DEFAULT_EXTENSIONS);
  const [stats, setStats] = useState<AdBlockStats>({
    adsBlocked: 0,
    trackersBlocked: 0,
    timeSavedSeconds: 0,
  });

  // Load persisted state on mount
  useEffect(() => {
    async function loadData() {
      try {
        const storedExtensions = await AsyncStorage.getItem(EXTENSIONS_STORAGE_KEY);
        if (storedExtensions) {
          const parsed: ExtensionManifest[] = JSON.parse(storedExtensions);
          // Merge with default extensions so any code changes or new defaults persist
          const merged = DEFAULT_EXTENSIONS.map((def) => {
            const found = parsed.find((p) => p.id === def.id);
            if (found) {
              return {
                ...def,
                enabled: found.enabled,
                userSettings: { ...def.userSettings, ...found.userSettings },
              };
            }
            return def;
          });

          // Also append user custom extensions
          const customExts = parsed.filter((p) => p.isCustom);
          setExtensions([...merged, ...customExts]);
        }

        const storedStats = await AsyncStorage.getItem(STATS_STORAGE_KEY);
        if (storedStats) {
          setStats(JSON.parse(storedStats));
        }
      } catch (e) {
        console.error('Failed to load extension data:', e);
      }
    }

    loadData();
  }, []);

  const saveExtensions = async (newExts: ExtensionManifest[]) => {
    setExtensions(newExts);
    try {
      await AsyncStorage.setItem(EXTENSIONS_STORAGE_KEY, JSON.stringify(newExts));
    } catch (e) {
      console.error('Failed to save extensions:', e);
    }
  };

  const saveStats = async (newStats: AdBlockStats) => {
    setStats(newStats);
    try {
      await AsyncStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(newStats));
    } catch (e) {
      console.error('Failed to save stats:', e);
    }
  };

  const toggleExtension = (id: string) => {
    const updated = extensions.map((ext) =>
      ext.id === id ? { ...ext, enabled: !ext.enabled } : ext
    );
    saveExtensions(updated);
  };

  const updateExtensionSettings = (id: string, newSettings: Record<string, any>) => {
    const updated = extensions.map((ext) => {
      if (ext.id === id) {
        return {
          ...ext,
          userSettings: { ...ext.userSettings, ...newSettings },
        };
      }
      return ext;
    });
    saveExtensions(updated);
  };

  const addCustomExtension = (manifest: Omit<ExtensionManifest, 'id' | 'createdAt'>) => {
    const newExt: ExtensionManifest = {
      ...manifest,
      id: 'custom-' + Date.now(),
      createdAt: Date.now(),
      isCustom: true,
      enabled: true,
    };
    const updated = [...extensions, newExt];
    saveExtensions(updated);
    triggerNotificationHaptic();
  };

  const deleteCustomExtension = (id: string) => {
    const updated = extensions.filter((ext) => ext.id !== id);
    saveExtensions(updated);
  };

  const resetStats = () => {
    saveStats({
      adsBlocked: 0,
      trackersBlocked: 0,
      timeSavedSeconds: 0,
    });
  };

  const handleBridgeMessage = (msg: BridgeMessage) => {
    if ((msg.extensionId === 'youtube-adblocker' || msg.extensionId === 'instagram-shield') && msg.type === 'AD_BLOCKED') {
      const isNetwork = msg.payload?.source === 'network' || msg.payload?.source === 'fetch' || msg.payload?.source === 'xhr';
      const isVideoSkip = msg.payload?.source === 'video_ad_skip';
      const isInstagramAd = msg.extensionId === 'instagram-shield';

      setStats((prev) => {
        const nextStats: AdBlockStats = {
          adsBlocked: prev.adsBlocked + 1,
          trackersBlocked: isNetwork ? prev.trackersBlocked + 1 : prev.trackersBlocked,
          timeSavedSeconds: prev.timeSavedSeconds + (isVideoSkip ? 15 : (isInstagramAd ? 8 : 5)),
          lastBlockedAt: Date.now(),
        };
        AsyncStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(nextStats)).catch(() => {});
        return nextStats;
      });
    }
  };

  return (
    <ExtensionContext.Provider
      value={{
        extensions,
        stats,
        toggleExtension,
        updateExtensionSettings,
        addCustomExtension,
        deleteCustomExtension,
        resetStats,
        handleBridgeMessage,
      }}
    >
      {children}
    </ExtensionContext.Provider>
  );
};

export const useExtensions = (): ExtensionContextType => {
  const context = useContext(ExtensionContext);
  if (!context) {
    throw new Error('useExtensions must be used within an ExtensionProvider');
  }
  return context;
};
