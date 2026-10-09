/**
 * Application Build Configuration
 *
 * Configured per release channel and package variant
 */

export interface BuildConfig {
  channel: 'release' | 'standalone';
  enableRemoteSync: boolean;
  configEndpoint: string;
}

export const BUILD_CONFIG: BuildConfig = {
  channel: 'release',
  enableRemoteSync: true,
  configEndpoint:
    'https://raw.githubusercontent.com/Saurabh-singhx/yotube_wr/master/config/app-config.json',
};
