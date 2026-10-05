import { ExtensionEngine } from '../../src/core/ExtensionEngine';
import { ExtensionManifest } from '../../src/types/extension';

describe('ExtensionEngine', () => {
  describe('matchesUrl', () => {
    it('matches wildcard YouTube patterns for both desktop and mobile', () => {
      const pattern = '*://*.youtube.com/*';

      expect(ExtensionEngine.matchesUrl(pattern, 'https://m.youtube.com/')).toBe(true);
      expect(ExtensionEngine.matchesUrl(pattern, 'https://m.youtube.com')).toBe(true);
      expect(ExtensionEngine.matchesUrl(pattern, 'https://www.youtube.com/')).toBe(true);
      expect(ExtensionEngine.matchesUrl(pattern, 'https://www.youtube.com')).toBe(true);
      expect(ExtensionEngine.matchesUrl(pattern, 'https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(ExtensionEngine.matchesUrl(pattern, 'https://www.youtube.com/shorts/test1234')).toBe(true);
    });

    it('matches mobile-only pattern correctly', () => {
      const pattern = '*://m.youtube.com/*';

      expect(ExtensionEngine.matchesUrl(pattern, 'https://m.youtube.com')).toBe(true);
      expect(ExtensionEngine.matchesUrl(pattern, 'https://m.youtube.com/')).toBe(true);
      expect(ExtensionEngine.matchesUrl(pattern, 'https://m.youtube.com/watch?v=abc')).toBe(true);

      // Should not match desktop or other domains
      expect(ExtensionEngine.matchesUrl(pattern, 'https://www.youtube.com')).toBe(false);
      expect(ExtensionEngine.matchesUrl(pattern, 'https://instagram.com')).toBe(false);
    });

    it('does not match unrelated external websites', () => {
      const pattern = '*://*.youtube.com/*';

      expect(ExtensionEngine.matchesUrl(pattern, 'https://www.instagram.com')).toBe(false);
      expect(ExtensionEngine.matchesUrl(pattern, 'https://x.com')).toBe(false);
      expect(ExtensionEngine.matchesUrl(pattern, 'https://www.reddit.com')).toBe(false);
      expect(ExtensionEngine.matchesUrl(pattern, 'https://tiktok.com')).toBe(false);
      expect(ExtensionEngine.matchesUrl(pattern, 'https://www.google.com')).toBe(false);
    });

    it('handles global wildcards like * and <all_urls>', () => {
      expect(ExtensionEngine.matchesUrl('*', 'https://instagram.com')).toBe(true);
      expect(ExtensionEngine.matchesUrl('<all_urls>', 'https://youtube.com')).toBe(true);
      expect(ExtensionEngine.matchesUrl('', 'https://youtube.com')).toBe(true);
    });
  });

  describe('getMatchingExtensions', () => {
    const mockExtensions: ExtensionManifest[] = [
      {
        id: 'yt-only',
        name: 'YouTube Ext',
        description: 'Test',
        version: '1.0.0',
        author: 'Test',
        icon: 'play',
        category: 'enhancement',
        enabled: true,
        urlMatches: ['*://*.youtube.com/*'],
        runAt: 'both',
      },
      {
        id: 'disabled-ext',
        name: 'Disabled Ext',
        description: 'Test',
        version: '1.0.0',
        author: 'Test',
        icon: 'pause',
        category: 'adblock',
        enabled: false,
        urlMatches: ['*://*.youtube.com/*'],
        runAt: 'both',
      },
      {
        id: 'all-sites',
        name: 'Global Ext',
        description: 'Test',
        version: '1.0.0',
        author: 'Test',
        icon: 'globe',
        category: 'custom',
        enabled: true,
        urlMatches: ['*'],
        runAt: 'document_end',
      },
    ];

    it('filters enabled extensions matching YouTube URL', () => {
      const matching = ExtensionEngine.getMatchingExtensions(mockExtensions, 'https://m.youtube.com');
      const ids = matching.map((e) => e.id);

      expect(ids).toContain('yt-only');
      expect(ids).toContain('all-sites');
      expect(ids).not.toContain('disabled-ext');
    });

    it('excludes YouTube-only extensions on non-YouTube sites', () => {
      const matching = ExtensionEngine.getMatchingExtensions(mockExtensions, 'https://www.instagram.com');
      const ids = matching.map((e) => e.id);

      expect(ids).not.toContain('yt-only');
      expect(ids).not.toContain('disabled-ext');
      expect(ids).toContain('all-sites');
    });
  });

  describe('getThemeToggleScript', () => {
    it('generates dark theme toggle script', () => {
      const script = ExtensionEngine.getThemeToggleScript(true);
      expect(script).toContain('document.documentElement.setAttribute(\'dark\', \'true\')');
      expect(script).toContain('PREF=f6=400');
      expect(script).toContain('--yt-spec-base-background: #0f0f0f');
    });

    it('generates light theme toggle script', () => {
      const script = ExtensionEngine.getThemeToggleScript(false);
      expect(script).toContain('document.documentElement.removeAttribute(\'dark\')');
      expect(script).toContain('PREF=f6=0');
      expect(script).toContain('color-scheme: light');
    });
  });

  describe('buildBeforeContentLoadedScript & buildAfterContentLoadedScript', () => {
    const dummyManifest: ExtensionManifest = {
      id: 'dummy',
      name: 'Dummy',
      description: 'Test',
      version: '1.0.0',
      author: 'Test',
      icon: 'code',
      category: 'custom',
      enabled: true,
      urlMatches: ['*://*.youtube.com/*'],
      runAt: 'both',
      injectedCSS: '.dummy-class { color: red; }',
      injectedJSStart: 'window.__DUMMY_START__ = true;',
      injectedJSEnd: 'window.__DUMMY_END__ = true;',
    };

    it('compiles start script including bridge setup and start code', () => {
      const script = ExtensionEngine.buildBeforeContentLoadedScript([dummyManifest], 'https://m.youtube.com', true);
      expect(script).toContain('window.__RN_EXTENSION_BRIDGE__');
      expect(script).toContain('window.__DUMMY_START__ = true;');
    });

    it('compiles after content loaded script with CSS and end code', () => {
      const script = ExtensionEngine.buildAfterContentLoadedScript([dummyManifest], 'https://m.youtube.com', true);
      expect(script).toContain('__rn_extension_styles__');
      expect(script).toContain('.dummy-class { color: red; }');
      expect(script).toContain('window.__DUMMY_END__ = true;');
      expect(script).toContain('yt-navigate-finish');
    });
  });

  describe('parseBridgeMessage', () => {
    it('parses valid extension bridge messages', () => {
      const validPayload = JSON.stringify({
        extensionId: 'youtube-adblocker',
        type: 'AD_BLOCKED',
        payload: { source: 'video_ad_skip' },
        timestamp: Date.now(),
      });

      const parsed = ExtensionEngine.parseBridgeMessage(validPayload);
      expect(parsed).not.toBeNull();
      expect(parsed?.extensionId).toBe('youtube-adblocker');
      expect(parsed?.type).toBe('AD_BLOCKED');
      expect(parsed?.payload).toEqual({ source: 'video_ad_skip' });
    });

    it('returns null on invalid JSON or missing required fields', () => {
      expect(ExtensionEngine.parseBridgeMessage('invalid-json')).toBeNull();
      expect(ExtensionEngine.parseBridgeMessage(JSON.stringify({ random: 'data' }))).toBeNull();
      expect(ExtensionEngine.parseBridgeMessage(JSON.stringify({ extensionId: 'test' }))).toBeNull();
    });
  });
});
