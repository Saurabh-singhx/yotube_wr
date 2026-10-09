import { APP_BUILD } from '../constants/version';
import { BUILD_CONFIG } from '../constants/buildConfig';

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
 * Evaluates remote app configuration and returns client status flags
 */
export async function checkAppStatus(
  endpoint = BUILD_CONFIG.configEndpoint,
  timeoutMs = 3500
): Promise<ConfigCheckResult> {
  if (!BUILD_CONFIG.enableRemoteSync || !endpoint) {
    return DEFAULT_RESULT;
  }

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
      return DEFAULT_RESULT;
    }

    const config: RemoteAppConfig = await response.json();

    const isStatusBlocked = typeof config.status === 'string' && config.status.toLowerCase() !== 'active';
    const isBuildOutdated = typeof config.minBuild === 'number' && APP_BUILD < config.minBuild;
    const isForceNotice = Boolean(config.notice?.enabled && config.notice?.force);

    const isBlocked = isStatusBlocked || isBuildOutdated || isForceNotice;

    const disabledExtensions = Array.isArray(config.disabledExtensions)
      ? config.disabledExtensions
      : [];

    if (isBlocked) {
      return {
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
    }

    return {
      isBlocked: false,
      disabledExtensions,
      config,
    };
  } catch {
    clearTimeout(timer);
    // Fail-open: allow standard operation if network request times out or is offline
    return DEFAULT_RESULT;
  }
}
