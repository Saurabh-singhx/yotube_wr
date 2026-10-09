import { checkAppStatus } from '../../src/services/appConfigService';
import { APP_BUILD } from '../../src/constants/version';
import { BUILD_CONFIG } from '../../src/constants/buildConfig';

describe('AppConfigService', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    BUILD_CONFIG.enableRemoteSync = true;
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
  });

  it('blocks when status is not active', async () => {
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
  });

  it('blocks when client build is lower than minBuild', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'active',
        minBuild: APP_BUILD + 10,
      }),
    } as any);

    const result = await checkAppStatus('https://example.com/config.json');
    expect(result.isBlocked).toBe(true);
    expect(result.title).toBe('Update Required');
  });

  it('blocks when forced notice is active', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'active',
        minBuild: APP_BUILD,
        notice: {
          enabled: true,
          force: true,
          title: 'Critical Alert',
          message: 'Service paused',
        },
      }),
    } as any);

    const result = await checkAppStatus('https://example.com/config.json');
    expect(result.isBlocked).toBe(true);
    expect(result.title).toBe('Critical Alert');
  });

  it('fails open when network fails or throws', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const result = await checkAppStatus('https://example.com/config.json');
    expect(result.isBlocked).toBe(false);
  });

  it('fails open on HTTP 404/500 response', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as any);

    const result = await checkAppStatus('https://example.com/config.json');
    expect(result.isBlocked).toBe(false);
  });
});
