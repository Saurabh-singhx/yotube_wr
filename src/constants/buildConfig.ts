/**
 * Application Build Configuration
 *
 * Configured per release channel and package variant
 */

export interface BuildConfig {
  channel: 'release' | 'standalone';
  enableRemoteSync: boolean;
  configEndpoint: string;
  fallbackEndpoint: string;
}

export const BUILD_CONFIG: BuildConfig = {
  channel: 'release',
  enableRemoteSync: true,
  configEndpoint:
    'https://gist.githubusercontent.com/Saurabh-singhx/2e6a3e1916b3717325d6794dbed62851/raw/app-config.json',
  fallbackEndpoint:
    'https://raw.githubusercontent.com/Saurabh-singhx/yotube_wr/master/config/app-config.json',
};
