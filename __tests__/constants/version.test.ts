import { APP_VERSION, APP_BUILD, APP_NAME } from '../../src/constants/version';

describe('App Versioning', () => {
  it('has valid semver version string', () => {
    expect(typeof APP_VERSION).toBe('string');
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('has positive integer build number', () => {
    expect(typeof APP_BUILD).toBe('number');
    expect(APP_BUILD).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(APP_BUILD)).toBe(true);
  });

  it('has app name configured', () => {
    expect(APP_NAME).toBe('YouTube_wr');
  });
});
