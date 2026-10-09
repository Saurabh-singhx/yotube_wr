import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  checkAppStatus,
  getCachedAppStatus,
  STATUS_CACHE_KEY,
} from '../../src/services/appConfigService';
import { APP_BUILD } from '../../src/constants/version';
import { BUILD_CONFIG } from '../../src/constants/buildConfig';

describe('AppConfigService', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    await AsyncStorage.clear();
    BUILD_CONFIG.enableRemoteSync = true;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fails open (not blocked) if remote sync is disabled', async () => {
    BUILD_CONFIG.enableRemoteSync = false;
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock;

    const result = await checkAppStatus('https://example.com/config.json');
    expect(result.isBlocked).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows access when status is active and build is up-to-date', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'active',
        minBuild: APP_BUILD,
        notice: { enabled: false },
      }),
    } as any);

    const result = await checkAppStatus('https://example.com/config.json');
    expect(result.isBlocked).toBe(false);
    expect(result.disabledExtensions).toEqual([]);
    // Ensure cache is cleared
    const cached = await AsyncStorage.getItem(STATUS_CACHE_KEY);
    expect(cached).toBeNull();
  });

  it('blocks and writes to AsyncStorage when status is not active', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'disabled',
        minBuild: APP_BUILD,
        notice: {
          title: 'System Offline',
          message: 'Maintenance in progress',
        },
      }),
    } as any);

    const result = await checkAppStatus('https://example.com/config.json');
    expect(result.isBlocked).toBe(true);
    expect(result.title).toBe('System Offline');
    expect(result.message).toBe('Maintenance in progress');

    // Verify stored in AsyncStorage
    const cachedRaw = await AsyncStorage.getItem(STATUS_CACHE_KEY);
    expect(cachedRaw).not.toBeNull();
    const cached = JSON.parse(cachedRaw!);
    expect(cached.isBlocked).toBe(true);
  });

  it('persists block so airplane mode / offline cannot bypass it', async () => {
    // 1. Initial check records block
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'disabled',
        minBuild: APP_BUILD,
      }),
    } as any);

    const initialResult = await checkAppStatus('https://example.com/config.json');
    expect(initialResult.isBlocked).toBe(true);

    // 2. Cold start check immediately retrieves block without network
    const coldStartResult = await getCachedAppStatus();
    expect(coldStartResult?.isBlocked).toBe(true);

    // 3. Airplane mode simulation: network fails completely
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Airplane mode / No network'));

    const offlineResult = await checkAppStatus('https://example.com/config.json');
    // Still blocked from persistent cache!
    expect(offlineResult.isBlocked).toBe(true);
  });

  it('clears persistent block when server returns active status', async () => {
    // 1. Store a blocked status in cache
    await AsyncStorage.setItem(
      STATUS_CACHE_KEY,
      JSON.stringify({ isBlocked: true, title: 'Blocked' })
    );

    // 2. Server now returns active status
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'active',
        minBuild: APP_BUILD,
      }),
    } as any);

    const result = await checkAppStatus('https://example.com/config.json');
    expect(result.isBlocked).toBe(false);

    // 3. Cache has been purged
    const cached = await AsyncStorage.getItem(STATUS_CACHE_KEY);
    expect(cached).toBeNull();
  });

  it('queries fallback endpoint if primary endpoint fails', async () => {
    globalThis.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('primary.com')) {
        return Promise.reject(new Error('Primary failed'));
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          status: 'disabled',
          minBuild: APP_BUILD,
          notice: { title: 'Fallback Mirror Response' },
        }),
      });
    });

    const result = await checkAppStatus(
      'https://primary.com/config.json',
      'https://fallback.com/config.json'
    );

    expect(result.isBlocked).toBe(true);
    expect(result.title).toBe('Fallback Mirror Response');
  });

  it('fails open on first-time launch when offline without prior cache', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network offline'));

    const result = await checkAppStatus('https://example.com/config.json');
    expect(result.isBlocked).toBe(false);
  });
});
