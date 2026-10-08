import { instagramShield } from '../../src/core/extensions/instagramShield';
import { ExtensionEngine } from '../../src/core/ExtensionEngine';

describe('Instagram Pro Shield - instagramShield Extension', () => {
  describe('Manifest Configuration', () => {
    it('has valid manifest configuration', () => {
      expect(instagramShield.id).toBe('instagram-shield');
      expect(instagramShield.name).toContain('Instagram Pro Shield');
      expect(instagramShield.category).toBe('adblock');
      expect(instagramShield.enabled).toBe(true);
      expect(instagramShield.urlMatches).toEqual(
        expect.arrayContaining(['*://*.instagram.com/*', '*://instagram.com/*'])
      );
    });

    it('has configurable user settings for sponsored ads, app nags, auto unmuting, reel mode, high quality, hide description, screen adjust, and suggestions', () => {
      expect(instagramShield.settings).toBeDefined();
      expect(instagramShield.settings!.length).toBeGreaterThanOrEqual(8);

      const settingIds = instagramShield.settings!.map((s) => s.id);
      expect(settingIds).toContain('blockSponsored');
      expect(settingIds).toContain('blockAppNags');
      expect(settingIds).toContain('unmuteVideos');
      expect(settingIds).toContain('reelMode');
      expect(settingIds).toContain('forceHighQuality');
      expect(settingIds).toContain('hideReelDescription');
      expect(settingIds).toContain('screenAdjustTwoFinger');
      expect(settingIds).toContain('hideSuggestedPosts');

      expect(instagramShield.userSettings?.blockSponsored).toBe(true);
      expect(instagramShield.userSettings?.blockAppNags).toBe(true);
      expect(instagramShield.userSettings?.unmuteVideos).toBe(true);
      expect(instagramShield.userSettings?.reelMode).toBe(true);
      expect(instagramShield.userSettings?.forceHighQuality).toBe(true);
      expect(instagramShield.userSettings?.hideReelDescription).toBe(true);
      expect(instagramShield.userSettings?.screenAdjustTwoFinger).toBe(true);
      expect(instagramShield.userSettings?.hideSuggestedPosts).toBe(false);
    });
  });

  describe('Domain Isolation Verification', () => {
    it('matches Instagram desktop and mobile web URLs', () => {
      const urls = [
        'https://www.instagram.com',
        'https://www.instagram.com/',
        'https://www.instagram.com/direct/inbox/',
        'https://www.instagram.com/reels/',
        'https://instagram.com/explore/',
      ];

      urls.forEach((url) => {
        const matches = instagramShield.urlMatches.some((pattern) =>
          ExtensionEngine.matchesUrl(pattern, url)
        );
        expect(matches).toBe(true);
      });
    });

    it('strictly DOES NOT match YouTube or other third-party URLs', () => {
      const nonInstagramUrls = [
        'https://m.youtube.com',
        'https://m.youtube.com/',
        'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com',
        'https://x.com',
        'https://reddit.com',
      ];

      nonInstagramUrls.forEach((url) => {
        const matches = instagramShield.urlMatches.some((pattern) =>
          ExtensionEngine.matchesUrl(pattern, url)
        );
        expect(matches).toBe(false);
      });
    });
  });

  describe('injectedJSStart (Document Start Quality Injection)', () => {
    it('sets high-DPI cookies, Wi-Fi network connection spoofing, and device pixel ratio when forceHighQuality is true', () => {
      const js = typeof instagramShield.injectedJSStart === 'function'
        ? instagramShield.injectedJSStart({ forceHighQuality: true })
        : '';

      expect(js).toContain('ig_pr=3');
      expect(js).toContain('navigator.connection');
      expect(js).toContain("type: { get: function() { return 'wifi'");
      expect(js).toContain("effectiveType: { get: function() { return '4g'");
      expect(js).toContain("saveData: { get: function() { return false;");
      expect(js).toContain('devicePixelRatio');
    });

    it('returns empty string when forceHighQuality is false', () => {
      const js = typeof instagramShield.injectedJSStart === 'function'
        ? instagramShield.injectedJSStart({ forceHighQuality: false })
        : '';

      expect(js).toBe('');
    });
  });

  describe('injectedCSS', () => {
    it('generates clean mobile layout rules and video quality rules', () => {
      const css = typeof instagramShield.injectedCSS === 'function'
        ? instagramShield.injectedCSS({ blockAppNags: false, hideSuggestedPosts: false, reelMode: false })
        : '';

      expect(css).toContain('Clean Mobile Instagram Layout');
      expect(css).toContain('image-rendering: high-quality !important');
    });

    it('generates immersive Reel Mode CSS when reelMode is true', () => {
      const css = typeof instagramShield.injectedCSS === 'function'
        ? instagramShield.injectedCSS({ blockAppNags: false, hideSuggestedPosts: false, reelMode: true, hideReelDescription: true })
        : '';

      // Hides top header, banner, and navigation
      expect(css).toContain('body.ig-reel-mode-active nav');
      expect(css).toContain('body.ig-reel-mode-active header');

      // Single full screen reel with snap scrolling and 100vh height
      expect(css).toContain('scroll-snap-type: y mandatory !important');
      expect(css).toContain('object-fit: cover !important');
      expect(css).toContain('height: 100vh !important');
      expect(css).toContain('width: 100vw !important');

      // Hides bottom navigation tablist & buttons safely
      expect(css).toContain('[data-ig-bottom-bar="hidden"]');

      // Compact user profile aligned at bottom left
      expect(css).toContain('bottom: 24px !important');
      expect(css).toContain('left: 14px !important');

      // Hides reel descriptions and captions
      expect(css).toContain('body.ig-reel-mode-active.ig-hide-description article h1');
      expect(css).toContain('body.ig-reel-mode-active.ig-hide-description article a[href*="/audio/"]');
    });

    it('generates app install nag hiding rules when blockAppNags is true', () => {
      const css = typeof instagramShield.injectedCSS === 'function'
        ? instagramShield.injectedCSS({ blockAppNags: true, hideSuggestedPosts: false, reelMode: false })
        : '';

      expect(css).toContain('play.google.com/store/apps/details?id=com.instagram.android');
      expect(css).toContain('instagram.com/download/');
      expect(css).toContain('display: none !important');
    });

    it('generates suggested posts hiding rules when hideSuggestedPosts is true', () => {
      const css = typeof instagramShield.injectedCSS === 'function'
        ? instagramShield.injectedCSS({ blockAppNags: false, hideSuggestedPosts: true, reelMode: false })
        : '';

      expect(css).toContain('Suggested posts');
      expect(css).toContain('Suggested for you');
      expect(css).toContain('display: none !important');
    });
  });

  describe('injectedJSEnd', () => {
    it('generates JavaScript with bridge reporting for blocked ads', () => {
      const js = typeof instagramShield.injectedJSEnd === 'function'
        ? instagramShield.injectedJSEnd({ blockSponsored: true, blockAppNags: true, unmuteVideos: true, reelMode: true, forceHighQuality: true, hideReelDescription: true, screenAdjustTwoFinger: true })
        : '';

      expect(js).toContain('window.__RN_EXTENSION_BRIDGE__');
      expect(js).toContain('instagram-shield');
      expect(js).toContain('AD_BLOCKED');
      expect(js).toContain('filterSponsoredPosts');
      expect(js).toContain('dismissAppNags');
      expect(js).toContain('unmuteMedia');
      expect(js).toContain('purgeInstagramBottomBar');
      expect(js).toContain('hideReelDescriptions');
      expect(js).toContain('optimizeVideoQuality');
      expect(js).toContain('MutationObserver');
    });

    it('includes auto-unmute logic when unmuteVideos is enabled', () => {
      const js = typeof instagramShield.injectedJSEnd === 'function'
        ? instagramShield.injectedJSEnd({ blockSponsored: true, blockAppNags: true, unmuteVideos: true, reelMode: true })
        : '';

      expect(js).toContain('video[muted]');
      expect(js).toContain('data-unmuted-attempted');
    });

    it('includes two-finger screen adjust gesture handling and Fit/Fill toggle', () => {
      const js = typeof instagramShield.injectedJSEnd === 'function'
        ? instagramShield.injectedJSEnd({ blockSponsored: true, blockAppNags: true, unmuteVideos: true, reelMode: true, screenAdjustTwoFinger: true })
        : '';

      expect(js).toContain('twoFingerStartDist');
      expect(js).toContain('isPinchingTwoFingers');
      expect(js).toContain('applyVideoScale');
      expect(js).toContain('ig-screen-adjust-toast');
      expect(js).toContain('e.touches.length === 2');
    });

    it('exposes Reel Mode actions on window.__INSTAGRAM_SHIELD_ACTIONS__ for native dock integration', () => {
      const js = typeof instagramShield.injectedJSEnd === 'function'
        ? instagramShield.injectedJSEnd({ blockSponsored: true, blockAppNags: true, unmuteVideos: true, reelMode: true })
        : '';

      expect(js).toContain('window.__INSTAGRAM_SHIELD_ACTIONS__');
      expect(js).toContain('next');
      expect(js).toContain('toggleAudio');
      expect(js).toContain('toggleReelModeManual');
      expect(js).toContain('adjustScreen');
      expect(js).toContain('toggleDescription');
      expect(js).toContain('navHome');
      expect(js).toContain('navSearch');
      expect(js).toContain('navReels');
      expect(js).toContain('navDirect');
      expect(js).toContain('navProfile');
    });
  });
});
