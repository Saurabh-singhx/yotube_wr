/**
 * @jest-environment jsdom
 */
import { youtubeAdBlocker } from '../../src/core/extensions/youtubeAdBlocker';

describe('AdShield Pro - youtubeAdBlocker Extension', () => {
  it('has valid manifest configuration', () => {
    expect(youtubeAdBlocker.id).toBe('youtube-adblocker');
    expect(youtubeAdBlocker.name).toContain('AdShield Pro');
    expect(youtubeAdBlocker.category).toBe('adblock');
    expect(youtubeAdBlocker.enabled).toBe(true);
    expect(youtubeAdBlocker.urlMatches).toEqual(
      expect.arrayContaining(['*://*.youtube.com/*', '*://m.youtube.com/*'])
    );
  });

  describe('injectedCSS (Cosmetic Filtering)', () => {
    it('returns empty string if blockBanners is false', () => {
      const css = typeof youtubeAdBlocker.injectedCSS === 'function'
        ? youtubeAdBlocker.injectedCSS({ blockBanners: false })
        : youtubeAdBlocker.injectedCSS;
      expect(css).toBe('');
    });

    it('returns CSS rules hiding promotional banner selectors and ad overlay elements when blockBanners is true', () => {
      const css = typeof youtubeAdBlocker.injectedCSS === 'function'
        ? youtubeAdBlocker.injectedCSS({ blockBanners: true })
        : youtubeAdBlocker.injectedCSS;
      expect(css).toContain('ytd-promoted-sparkles-web-renderer');
      expect(css).toContain('ytm-promoted-sparkles-web-renderer');
      expect(css).toContain('#player-ads');
      expect(css).toContain('ytm-companion-slot');
      expect(css).toContain('.ytp-ad-player-overlay');
      expect(css).toContain('.ytp-ad-skip-button-slot');
      expect(css).toContain('.ytp-ad-badge');
      expect(css).toContain('display: none !important');
    });

    it('never hides the video-ads container or player surface itself (to prevent black screen stalls)', () => {
      const css = typeof youtubeAdBlocker.injectedCSS === 'function'
        ? youtubeAdBlocker.injectedCSS({ blockBanners: true })
        : youtubeAdBlocker.injectedCSS;
      // .video-ads and #movie_player must NEVER be hidden directly
      expect(css).not.toMatch(/\.video-ads\s*,\s*\.html5-video-player/);
      expect(css).not.toMatch(/#movie_player\s*\{/);
    });
  });

  describe('injectedJSStart (Data-Level Ad Schedule Pruning)', () => {
    it('initializes window bridge preparation without breaking native fetch streams', () => {
      const js = typeof youtubeAdBlocker.injectedJSStart === 'function'
        ? youtubeAdBlocker.injectedJSStart({})
        : youtubeAdBlocker.injectedJSStart;
      expect(js).toContain('__AD_INTERCEPT_LOADED__');
      expect(js).toContain('ytInitialPlayerResponse');
      expect(js).toContain('pruneAdData');
      expect(js).toContain('Response.prototype.json');
      expect(js).toContain('JSON.parse');
      // Should not monkey-patch fetch stream object itself (which causes content decoding failures)
      expect(js).not.toContain('window.fetch =');
    });

    it('sanitizes ytInitialPlayerResponse by deleting adPlacements and adSlots', () => {
      const js = typeof youtubeAdBlocker.injectedJSStart === 'function'
        ? youtubeAdBlocker.injectedJSStart({})
        : '';
      eval(js!);

      // Set initial player response with ad metadata
      const mockResponse = {
        adPlacements: [{ adPlacementRenderer: {} }],
        playerAds: [{ playerAdRenderer: {} }],
        adSlots: [{ adSlotRenderer: {} }],
        adBreakHeartbeatParams: 'params',
        videoDetails: { title: 'Test Video' }
      };

      (window as any).ytInitialPlayerResponse = mockResponse;

      // Assert that ad properties are purged while videoDetails remains intact
      expect((window as any).ytInitialPlayerResponse.adPlacements).toBeUndefined();
      expect((window as any).ytInitialPlayerResponse.playerAds).toBeUndefined();
      expect((window as any).ytInitialPlayerResponse.adSlots).toBeUndefined();
      expect((window as any).ytInitialPlayerResponse.adBreakHeartbeatParams).toBeUndefined();
      expect((window as any).ytInitialPlayerResponse.videoDetails.title).toBe('Test Video');
    });

    it('sanitizes parsed JSON objects containing adPlacements in JSON.parse', () => {
      const js = typeof youtubeAdBlocker.injectedJSStart === 'function'
        ? youtubeAdBlocker.injectedJSStart({})
        : '';
      eval(js!);

      const jsonStr = JSON.stringify({
        playerResponse: {
          adPlacements: [{ foo: 'bar' }],
          adSlots: [{ slot: 1 }]
        },
        other: 123
      });

      const parsed = JSON.parse(jsonStr);
      expect(parsed.playerResponse.adPlacements).toBeUndefined();
      expect(parsed.playerResponse.adSlots).toBeUndefined();
      expect(parsed.other).toBe(123);
    });
  });

  describe('injectedJSEnd (Active Ad Skipping Script)', () => {
    it('returns empty string if blockVideoAds is false', () => {
      const js = typeof youtubeAdBlocker.injectedJSEnd === 'function'
        ? youtubeAdBlocker.injectedJSEnd({ blockVideoAds: false })
        : youtubeAdBlocker.injectedJSEnd;
      expect(js).toBe('');
    });

    it('generates the active skipping script with 16x safe speed and duration end skip', () => {
      const js = typeof youtubeAdBlocker.injectedJSEnd === 'function'
        ? youtubeAdBlocker.injectedJSEnd({ blockVideoAds: true, muteDuringAd: true })
        : youtubeAdBlocker.injectedJSEnd;
      expect(js).toContain('__AD_SKIPPER_ACTIVE__');
      expect(js).toContain('video.playbackRate = 16.0');
      expect(js).toContain('video.currentTime = Math.max');
      expect(js).toContain('MutationObserver');
      expect(js).toContain('clickSkipButtons');
      expect(js).toContain('dismissWarnings');
    });

    it('respects muteDuringAd option', () => {
      const jsMuted = typeof youtubeAdBlocker.injectedJSEnd === 'function'
        ? youtubeAdBlocker.injectedJSEnd({ blockVideoAds: true, muteDuringAd: true })
        : '';
      const jsUnmuted = typeof youtubeAdBlocker.injectedJSEnd === 'function'
        ? youtubeAdBlocker.injectedJSEnd({ blockVideoAds: true, muteDuringAd: false })
        : '';

      expect(jsMuted).toContain('if (true)');
      expect(jsUnmuted).toContain('if (false)');
    });
  });

  describe('Ad Skipping Execution in simulated DOM', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
      (window as any).__AD_SKIPPER_ACTIVE__ = false;
      (window as any).__RN_EXTENSION_BRIDGE__ = {
        send: jest.fn(),
      };
    });

    afterEach(() => {
      jest.clearAllTimers();
    });

    it('detects ad container and immediately skips, mutes, and fast-forwards', () => {
      jest.useFakeTimers();

      // Create video element
      const video = document.createElement('video');
      video.muted = false;
      video.volume = 1.0;
      video.playbackRate = 1.0;
      Object.defineProperty(video, 'duration', { value: 15, writable: true });
      Object.defineProperty(video, 'readyState', { value: 4, writable: true });
      video.currentTime = 1;
      video.play = jest.fn().mockResolvedValue(undefined);
      document.body.appendChild(video);

      // Create ad container
      const player = document.createElement('div');
      player.id = 'movie_player';
      player.className = 'html5-video-player ad-showing';
      document.body.appendChild(player);

      // Create skip button
      const skipBtn = document.createElement('button');
      skipBtn.className = 'ytp-ad-skip-button';
      skipBtn.click = jest.fn();
      document.body.appendChild(skipBtn);

      // Execute injected script
      const scriptCode = typeof youtubeAdBlocker.injectedJSEnd === 'function'
        ? youtubeAdBlocker.injectedJSEnd({ blockVideoAds: true, muteDuringAd: true })
        : '';
      // Evaluate script in context
      eval(scriptCode!);

      // Advance timer by 50ms to trigger runAdSkipper
      jest.advanceTimersByTime(50);

      // Assertions
      expect(video.muted).toBe(true);
      expect(video.volume).toBe(0);
      expect(video.playbackRate).toBe(16.0);
      expect(video.currentTime).toBeGreaterThanOrEqual(14);
      expect(skipBtn.click).toHaveBeenCalled();
      expect((window as any).__RN_EXTENSION_BRIDGE__.send).toHaveBeenCalledWith(
        'youtube-adblocker',
        'AD_BLOCKED',
        expect.objectContaining({ source: 'video_ad_skip' })
      );

      jest.useRealTimers();
    });

    it('restores normal speed and volume once ad ends after debounce period', () => {
      jest.useFakeTimers();

      const video = document.createElement('video');
      video.muted = false;
      video.volume = 0.8;
      video.playbackRate = 1.0;
      Object.defineProperty(video, 'duration', { value: 30, writable: true });
      Object.defineProperty(video, 'readyState', { value: 4, writable: true });
      video.currentTime = 0;
      video.play = jest.fn().mockResolvedValue(undefined);
      document.body.appendChild(video);

      const player = document.createElement('div');
      player.id = 'player';
      player.className = 'ad-showing';
      document.body.appendChild(player);

      const scriptCode = typeof youtubeAdBlocker.injectedJSEnd === 'function'
        ? youtubeAdBlocker.injectedJSEnd({ blockVideoAds: true, muteDuringAd: true })
        : '';
      eval(scriptCode!);

      // Tick while ad is showing
      jest.advanceTimersByTime(50);
      expect(video.playbackRate).toBe(16.0);
      expect(video.muted).toBe(true);

      // Ad ends: remove ad-showing class
      player.className = 'html5-video-player';

      // Within debounce window (< 150ms), volume and rate are preserved to avoid audio pop / flicker
      jest.advanceTimersByTime(100);
      expect(video.playbackRate).toBe(16.0);
      expect(video.muted).toBe(true);

      // After debounce window expires (> 150ms), normal speed and volume are cleanly restored
      jest.advanceTimersByTime(100);
      expect(video.playbackRate).toBe(1.0);
      expect(video.muted).toBe(false);
      expect(video.volume).toBe(0.8);

      jest.useRealTimers();
    });

    it('prevents flicker during sequential ads (Ad 1 of 2 -> Ad 2 of 2) via debounce lock', () => {
      jest.useFakeTimers();

      const video = document.createElement('video');
      video.muted = false;
      video.volume = 0.9;
      video.playbackRate = 1.0;
      Object.defineProperty(video, 'duration', { value: 15, writable: true });
      Object.defineProperty(video, 'readyState', { value: 4, writable: true });
      video.currentTime = 0;
      video.play = jest.fn().mockResolvedValue(undefined);
      document.body.appendChild(video);

      const player = document.createElement('div');
      player.id = 'player';
      player.className = 'ad-showing';
      document.body.appendChild(player);

      const scriptCode = typeof youtubeAdBlocker.injectedJSEnd === 'function'
        ? youtubeAdBlocker.injectedJSEnd({ blockVideoAds: true, muteDuringAd: true })
        : '';
      eval(scriptCode!);

      // Ad 1 starts: muted and 16x
      jest.advanceTimersByTime(50);
      expect(video.muted).toBe(true);
      expect(video.playbackRate).toBe(16.0);

      // Ad 1 finishes, YouTube momentarily removes ad-showing class for 60ms before mounting Ad 2
      player.className = 'html5-video-player';
      jest.advanceTimersByTime(60);

      // Debounce lock holds: speed and mute do NOT bounce back to 1.0 / unmuted (no pop / no flicker)
      expect(video.muted).toBe(true);
      expect(video.playbackRate).toBe(16.0);

      // Ad 2 mounts within the 150ms debounce window
      player.className = 'html5-video-player ad-showing';
      jest.advanceTimersByTime(50);

      // Still muted and 16x without ever glitching or unmuting
      expect(video.muted).toBe(true);
      expect(video.playbackRate).toBe(16.0);

      jest.useRealTimers();
    });

    it('auto-dismisses anti-adblock dialogs if they appear', () => {
      jest.useFakeTimers();

      const dialog = document.createElement('tp-yt-paper-dialog');
      const dismissBtn = document.createElement('button');
      dismissBtn.id = 'dismiss-button';
      dismissBtn.click = jest.fn();
      dialog.appendChild(dismissBtn);
      document.body.appendChild(dialog);

      const backdrop = document.createElement('tp-yt-iron-overlay-backdrop');
      backdrop.setAttribute('opened', '');
      backdrop.remove = jest.fn();
      document.body.appendChild(backdrop);

      const scriptCode = typeof youtubeAdBlocker.injectedJSEnd === 'function'
        ? youtubeAdBlocker.injectedJSEnd({ blockVideoAds: true, muteDuringAd: true })
        : '';
      eval(scriptCode!);

      jest.advanceTimersByTime(50);

      expect(dismissBtn.click).toHaveBeenCalled();
      expect(backdrop.remove).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('does not treat real video as an ad when player.isAdShowing returns false despite lingering ad-showing class', () => {
      jest.useFakeTimers();

      const video = document.createElement('video');
      video.muted = false;
      video.volume = 1.0;
      video.playbackRate = 1.0;
      Object.defineProperty(video, 'duration', { value: 600, writable: true });
      Object.defineProperty(video, 'readyState', { value: 4, writable: true });
      video.currentTime = 5;
      video.play = jest.fn().mockResolvedValue(undefined);
      document.body.appendChild(video);

      const player = document.createElement('div');
      player.id = 'movie_player';
      // Lingering class from YouTube
      player.className = 'html5-video-player ad-showing';
      // But native API reports NO ad is showing!
      (player as any).isAdShowing = jest.fn().mockReturnValue(false);
      document.body.appendChild(player);

      const scriptCode = typeof youtubeAdBlocker.injectedJSEnd === 'function'
        ? youtubeAdBlocker.injectedJSEnd({ blockVideoAds: true, muteDuringAd: true })
        : '';
      eval(scriptCode!);

      jest.advanceTimersByTime(50);

      // Must NOT fast-forward or jump the real video
      expect(video.playbackRate).toBe(1.0);
      expect(video.currentTime).toBe(5);
      expect(video.muted).toBe(false);

      jest.useRealTimers();
    });
  });
});
