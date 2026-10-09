import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_BUILD } from '../constants/version';
import { BUILD_CONFIG } from '../constants/buildConfig';

export const STATUS_CACHE_KEY = '@app_system_status_v1';

export interface RemoteNotice {
  enabled: boolean;
  force?: boolean;
  title?: string;
  message?: string;
  actionText?: string;
  actionUrl?: string;
}

export interface RemoteAppConfig {
  status: 'active' | 'disabled' | 'maintenance' | string;
  minBuild?: number;
  minVersion?: string;
  notice?: RemoteNotice;
  disabledExtensions?: string[];
}

export interface ConfigCheckResult {
  isBlocked: boolean;
  title?: string;
  message?: string;
  actionText?: string;
  actionUrl?: string;
  disabledExtensions: string[];
  config: RemoteAppConfig | null;
}

const DEFAULT_RESULT: ConfigCheckResult = {
  isBlocked: false,
  disabledExtensions: [],
  config: null,
};

/**
 * Retrieves previously cached status from persistent storage.
 * Used on cold startup to immediately enforce blocks even before network resolves.
 */
export async function getCachedAppStatus(): Promise<ConfigCheckResult | null> {
  if (!BUILD_CONFIG.enableRemoteSync) {
    return null;
  }

  try {
    const raw = await AsyncStorage.getItem(STATUS_CACHE_KEY);
    if (!raw) return null;

    const parsed: ConfigCheckResult = JSON.parse(raw);
    if (parsed && parsed.isBlocked) {
      // If the app was upgraded since cache was stored and now satisfies minBuild with active status, clear it
      if (
        parsed.config &&
        parsed.config.status === 'active' &&
        typeof parsed.config.minBuild === 'number' &&
        APP_BUILD >= parsed.config.minBuild &&
        !parsed.config.notice?.force
      ) {
        await AsyncStorage.removeItem(STATUS_CACHE_KEY).catch(() => {});
        return null;
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchFromEndpoint(
  endpoint: string,
  timeoutMs: number
): Promise<RemoteAppConfig | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const separator = endpoint.includes('?') ? '&' : '?';
    const cacheBusterUrl = `${endpoint}${separator}_t=${Date.now()}`;

    const response = await fetch(cacheBusterUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      return null;
    }

    const data: RemoteAppConfig = await response.json();
    return data;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/**
 * Evaluates remote app configuration with persistent cache and fallback mirror
 */
export async function checkAppStatus(
  primaryEndpoint = BUILD_CONFIG.configEndpoint,
  fallbackEndpoint = BUILD_CONFIG.fallbackEndpoint,
  timeoutMs = 3500
): Promise<ConfigCheckResult> {
  if (!BUILD_CONFIG.enableRemoteSync) {
    return DEFAULT_RESULT;
  }

  // 1. Try primary endpoint
  let config = await fetchFromEndpoint(primaryEndpoint, timeoutMs);

  // 2. If primary failed and fallback is defined, try fallback mirror
  if (!config && fallbackEndpoint && fallbackEndpoint !== primaryEndpoint) {
    config = await fetchFromEndpoint(fallbackEndpoint, timeoutMs);
  }

  // 3. If online response received: evaluate and synchronize persistent storage
  if (config) {
    const isStatusBlocked =
      typeof config.status === 'string' && config.status.toLowerCase() !== 'active';
    const isBuildOutdated = typeof config.minBuild === 'number' && APP_BUILD < config.minBuild;
    const isForceNotice = Boolean(config.notice?.enabled && config.notice?.force);

    const isBlocked = isStatusBlocked || isBuildOutdated || isForceNotice;
    const disabledExtensions = Array.isArray(config.disabledExtensions)
      ? config.disabledExtensions
      : [];

    if (isBlocked) {
      const result: ConfigCheckResult = {
        isBlocked: true,
        title:
          config.notice?.title ||
          (isBuildOutdated ? 'Update Required' : 'Service Notice'),
        message:
          config.notice?.message ||
          (isBuildOutdated
            ? 'This version of the application is no longer supported. Please install the latest release to continue.'
            : 'The application is currently unavailable. Please check back later.'),
        actionText: config.notice?.actionText || 'Download Update',
        actionUrl:
          config.notice?.actionUrl ||
          'https://github.com/Saurabh-singhx/yotube_wr/releases',
        disabledExtensions,
        config,
      };

      // Persist the block so offline bypass / airplane mode cannot defeat it
      try {
        await AsyncStorage.setItem(STATUS_CACHE_KEY, JSON.stringify(result));
      } catch {
        // Safe fallback
      }

      return result;
    }

    // App is active and authorized: clear any previous persistent lock
    try {
      await AsyncStorage.removeItem(STATUS_CACHE_KEY);
    } catch {
      // Safe fallback
    }

    return {
      isBlocked: false,
      disabledExtensions,
      config,
    };
  }

  // 4. Network failed or offline: check if persistent cache already recorded a block
  try {
    const cachedBlock = await getCachedAppStatus();
    if (cachedBlock && cachedBlock.isBlocked) {
      return cachedBlock;
    }
  } catch {
    // Safe fallback
  }

  // Fail-open for first-time offline runs
  return DEFAULT_RESULT;
}
