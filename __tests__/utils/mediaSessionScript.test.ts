import {
  getBackgroundPlayScript,
  getMediaObserverScript,
  getRemoteControlScript,
} from '../../src/utils/mediaSessionScript';

describe('mediaSessionScript', () => {
  describe('getBackgroundPlayScript', () => {
    it('generates non-empty JavaScript string', () => {
      const script = getBackgroundPlayScript();
      expect(typeof script).toBe('string');
      expect(script.length).toBeGreaterThan(100);
    });

    it('spoofs document visibility properties to prevent background auto-pause', () => {
      const script = getBackgroundPlayScript();
      expect(script).toContain("visibilityState: { get: function() { return 'visible'; }");
      expect(script).toContain("hidden: { get: function() { return false; }");
      expect(script).toContain('webkitHidden');
      expect(script).toContain('webkitVisibilityState');
    });

    it('intercepts and suppresses visibilitychange, pagehide, and freeze listeners', () => {
      const script = getBackgroundPlayScript();
      expect(script).toContain('visibilitychange');
      expect(script).toContain('webkitvisibilitychange');
      expect(script).toContain('pagehide');
      expect(script).toContain('freeze');
      expect(script).toContain('EventTarget');
      expect(script).toContain('swallowEvent');
    });

    it('proxies IntersectionObserver to shield main player from offscreen auto-pause', () => {
      const script = getBackgroundPlayScript();
      expect(script).toContain('window.IntersectionObserver');
      expect(script).toContain('isIntersecting');
      expect(script).toContain('intersectionRatio');
    });

    it('tracks user gestures and intercepts HTMLMediaElement pause to prevent automated background pause', () => {
      const script = getBackgroundPlayScript();
      expect(script).toContain('window.__lastUserGestureTime');
      expect(script).toContain('window.__lastPlayerInteractionTime');
      expect(script).toContain('window.__isAppInBackground');
      expect(script).toContain('window.__userWantsPaused');
      expect(script).toContain('HTMLMediaElement.prototype.pause');
      expect(script).toContain('HTMLMediaElement.prototype.play');
    });

    it('sets up navigator.mediaSession bridge and interceptors', () => {
      const script = getBackgroundPlayScript();
      expect(script).toContain('window.navigator.mediaSession');
      expect(script).toContain('window.__ytwrMediaActions');
      expect(script).toContain('METADATA_UPDATE');
      expect(script).toContain('POSITION_UPDATE');
    });
  });

  describe('getMediaObserverScript', () => {
    it('generates DOM observer script for video elements with keepalive watchdog', () => {
      const script = getMediaObserverScript();
      expect(typeof script).toBe('string');
      expect(script).toContain('attachToVideo');
      expect(script).toContain('MutationObserver');
      expect(script).toContain('MEDIA_STATE_UPDATE');
      expect(script).toContain('window.__userWantsPaused');
      expect(script).toContain('setInterval');
    });

    it('extracts metadata using mobile YouTube DOM selectors and video ID', () => {
      const script = getMediaObserverScript();
      expect(script).toContain('.slim-video-metadata-title');
      expect(script).toContain('.slim-owner-channel-name');
      expect(script).toContain('i.ytimg.com/vi/');
    });
  });

  describe('getRemoteControlScript', () => {
    it('generates play command', () => {
      const script = getRemoteControlScript('PLAY');
      expect(script).toContain("case 'PLAY':");
      expect(script).toContain('window.__isRemotePlayCommand = true');
      expect(script).toContain("actions['play']()");
      expect(script).toContain('video.play()');
    });

    it('generates pause command', () => {
      const script = getRemoteControlScript('PAUSE');
      expect(script).toContain("case 'PAUSE':");
      expect(script).toContain("actions['pause']()");
      expect(script).toContain('video.pause()');
    });

    it('generates fast forward (+10s) command', () => {
      const script = getRemoteControlScript('FAST_FORWARD');
      expect(script).toContain("case 'FAST_FORWARD':");
      expect(script).toContain('seekforward');
      expect(script).toContain('+ 10');
    });

    it('generates rewind (-10s) command', () => {
      const script = getRemoteControlScript('REWIND');
      expect(script).toContain("case 'REWIND':");
      expect(script).toContain('seekbackward');
      expect(script).toContain('- 10');
    });

    it('generates seek_to command with position in seconds', () => {
      const script = getRemoteControlScript('SEEK_TO', 45.5);
      expect(script).toContain("case 'SEEK_TO':");
      expect(script).toContain('45.5');
    });

    it('safely falls back to 0 for invalid seek position', () => {
      const script = getRemoteControlScript('SEEK_TO', NaN);
      expect(script).toContain('seekTime: 0');
    });

    it('generates skip_next command', () => {
      const script = getRemoteControlScript('SKIP_NEXT');
      expect(script).toContain("case 'SKIP_NEXT':");
      expect(script).toContain('.ytp-next-button');
    });

    it('generates skip_prev command', () => {
      const script = getRemoteControlScript('SKIP_PREV');
      expect(script).toContain("case 'SKIP_PREV':");
      expect(script).toContain('window.history.back()');
    });
  });

  describe('DOM runtime behavior', () => {
    let mockWindow: any;
    let mockDocument: any;
    let isPaused: boolean;
    let currentTime: number;
    let nextVideoCalled: boolean;
    let prevVideoCalled: boolean;
    let seekToTime: number | null;
    let playVideoCalled: boolean;

    beforeEach(() => {
      isPaused = false;
      currentTime = 100;
      nextVideoCalled = false;
      prevVideoCalled = false;
      seekToTime = null;
      playVideoCalled = false;

      const { JSDOM } = require('jsdom');
      const dom = new JSDOM(
        `<!DOCTYPE html>
        <html>
        <body>
          <div id="movie_player" class="html5-video-player">
            <video class="video-stream"></video>
            <button class="ytp-play-button" aria-label="Pause (k)"></button>
            <button class="ytp-next-button" aria-label="Next (SHIFT+n)"></button>
            <button class="ytp-prev-button" aria-label="Previous (SHIFT+p)"></button>
          </div>
          <div class="system-nav-bar"></div>
        </body>
        </html>`,
        { runScripts: 'dangerously', url: 'https://m.youtube.com/watch?v=test1234' }
      );

      mockWindow = dom.window;
      mockDocument = mockWindow.document;

      mockWindow.HTMLMediaElement.prototype.pause = function () {
        isPaused = true;
      };
      mockWindow.HTMLMediaElement.prototype.play = function () {
        isPaused = false;
        return Promise.resolve();
      };

      const video = mockDocument.querySelector('video');
      Object.defineProperty(video, 'paused', { get: () => isPaused, configurable: true });
      Object.defineProperty(video, 'currentTime', {
        get: () => currentTime,
        set: (v: number) => {
          currentTime = v;
        },
        configurable: true,
      });
      Object.defineProperty(video, 'duration', { get: () => 300, configurable: true });

      const moviePlayer = mockDocument.getElementById('movie_player');
      moviePlayer.playVideo = () => {
        playVideoCalled = true;
        isPaused = false;
      };
      moviePlayer.pauseVideo = () => {
        isPaused = true;
      };
      moviePlayer.nextVideo = () => {
        nextVideoCalled = true;
      };
      moviePlayer.previousVideo = () => {
        prevVideoCalled = true;
      };
      moviePlayer.seekTo = (t: number) => {
        seekToTime = t;
        currentTime = t;
      };

      mockWindow.eval(getBackgroundPlayScript());
    });

    it('spoofs Document visibility properties', () => {
      expect(mockDocument.hidden).toBe(false);
      expect(mockDocument.visibilityState).toBe('visible');
    });

    it('allows video to pause and play naturally in foreground when user touched player', () => {
      mockWindow.__isAppInBackground = false;
      mockWindow.__windowHasBlur = false;
      mockWindow.__lastBlurTime = 0;
      mockWindow.__lastPlayerInteractionTime = Date.now();
      isPaused = false;

      const video = mockDocument.querySelector('video');
      video.pause();
      expect(isPaused).toBe(true);
    });

    it('suppresses automated pause when app enters background', () => {
      isPaused = false;
      mockWindow.__isAppInBackground = true;

      const video = mockDocument.querySelector('video');
      video.pause();
      expect(isPaused).toBe(false);
    });

    it('allows intentional pause command from notification while in background', () => {
      isPaused = false;
      mockWindow.__isAppInBackground = true;

      mockWindow.eval(getRemoteControlScript('PAUSE'));
      expect(isPaused).toBe(true);
      expect(mockWindow.__userWantsPaused).toBe(true);
    });

    it('resumes playback from notification PLAY command while in background', () => {
      isPaused = true;
      mockWindow.__isAppInBackground = true;
      mockWindow.__userWantsPaused = true;

      mockWindow.eval(getRemoteControlScript('PLAY'));
      expect(isPaused).toBe(false);
      expect(mockWindow.__userWantsPaused).toBe(false);
      expect(playVideoCalled).toBe(true);
    });

    it('controls track navigation via notification commands (SKIP_NEXT, SKIP_PREV)', () => {
      mockWindow.eval(getRemoteControlScript('SKIP_NEXT'));
      expect(nextVideoCalled).toBe(true);

      mockWindow.eval(getRemoteControlScript('SKIP_PREV'));
      expect(prevVideoCalled).toBe(true);
    });

    it('seeks track position via notification commands (REWIND, FAST_FORWARD)', () => {
      currentTime = 50;
      mockWindow.eval(getRemoteControlScript('REWIND'));
      expect(seekToTime).toBe(40);

      mockWindow.eval(getRemoteControlScript('FAST_FORWARD'));
      expect(seekToTime).toBe(50);
    });

    it('allows direct player pause in foreground after user tap on play/pause button', () => {
      mockWindow.__isAppInBackground = false;
      mockWindow.__windowHasBlur = false;
      mockWindow.__lastBlurTime = 0;
      isPaused = false;

      const playBtn = mockDocument.querySelector('.ytp-play-button');
      playBtn.dispatchEvent(new mockWindow.MouseEvent('click', { bubbles: true }));

      const video = mockDocument.querySelector('video');
      video.pause();
      expect(isPaused).toBe(true);
    });

    it('suppresses background pause on mobile YouTube watch page even without desktop #movie_player container', () => {
      const { JSDOM } = require('jsdom');
      const mobileDom = new JSDOM(
        `<!DOCTYPE html>
        <html>
        <body>
          <div id="player-container-id" class="video-player">
            <video class="video-stream"></video>
          </div>
        </body>
        </html>`,
        { runScripts: 'dangerously', url: 'https://m.youtube.com/watch?v=mobile123' }
      );
      let mobilePaused = false;
      mobileDom.window.HTMLMediaElement.prototype.pause = function () {
        mobilePaused = true;
      };
      mobileDom.window.eval(getBackgroundPlayScript());
      mobileDom.window.__isAppInBackground = true;

      const mobileVideo = mobileDom.window.document.querySelector('video');
      mobileVideo.pause();
      expect(mobilePaused).toBe(false);
    });

    it('allows thumbnail preview videos to pause freely', () => {
      const { JSDOM } = require('jsdom');
      const previewDom = new JSDOM(
        `<!DOCTYPE html>
        <html>
        <body>
          <div class="inline-preview ytm-video-preview">
            <video></video>
          </div>
        </body>
        </html>`,
        { runScripts: 'dangerously', url: 'https://m.youtube.com' }
      );
      let previewPaused = false;
      previewDom.window.HTMLMediaElement.prototype.pause = function () {
        previewPaused = true;
      };
      previewDom.window.eval(getBackgroundPlayScript());
      previewDom.window.__isAppInBackground = true;

      const previewVideo = previewDom.window.document.querySelector('video');
      previewVideo.pause();
      expect(previewPaused).toBe(true);
    });

    it('allows ended video to pause in background', () => {
      isPaused = false;
      mockWindow.__isAppInBackground = true;

      const video = mockDocument.querySelector('video');
      Object.defineProperty(video, 'ended', { get: () => true, configurable: true });
      video.pause();
      expect(isPaused).toBe(true);
    });

    it('suppresses pause in foreground when no user touch occurred (minimize / blur race condition)', () => {
      isPaused = false;
      mockWindow.__isAppInBackground = false;
      // Stale touch timestamp (> 1200ms ago)
      mockWindow.__lastUserGestureTime = Date.now() - 5000;

      const video = mockDocument.querySelector('video');
      video.pause();
      expect(isPaused).toBe(false);
    });

    it('shields main player elements via IntersectionObserver proxy', () => {
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM(
        `<!DOCTYPE html><html><body><div id="movie_player"><video></video></div></body></html>`,
        { runScripts: 'dangerously', url: 'https://m.youtube.com' }
      );
      let capturedEntries: any[] = [];
      dom.window.IntersectionObserver = class MockIntersectionObserver {
        private cb: any;
        constructor(callback: any) {
          this.cb = callback;
        }
        observe(target: any) {
          this.cb([{ target, isIntersecting: false, intersectionRatio: 0 }]);
        }
        unobserve() {}
        disconnect() {}
      };

      dom.window.eval(getBackgroundPlayScript());

      const observer = new dom.window.IntersectionObserver((entries: any[]) => {
        capturedEntries = entries;
      });
      const video = dom.window.document.querySelector('video');
      observer.observe(video);

      expect(capturedEntries.length).toBe(1);
      expect(capturedEntries[0].isIntersecting).toBe(true);
      expect(capturedEntries[0].intersectionRatio).toBe(1.0);
    });

    it('suppresses pause on window blur or minimize transition even in foreground', () => {
      isPaused = false;
      mockWindow.__isAppInBackground = false;
      mockWindow.__windowHasBlur = true;
      mockWindow.__lastBlurTime = Date.now();
      mockWindow.__lastPlayerInteractionTime = 0;

      const video = mockDocument.querySelector('video');
      video.pause();
      expect(isPaused).toBe(false);
    });

    it('does not authorize pause when user touches recommendation items or non-pause elements', () => {
      isPaused = false;
      mockWindow.__isAppInBackground = false;
      mockWindow.__windowHasBlur = false;
      mockWindow.__lastBlurTime = 0;
      mockWindow.__lastPauseButtonTapTime = 0;
      mockWindow.__lastPlayerInteractionTime = 0;

      // Create a recommendation video item
      const recItem = mockDocument.createElement('div');
      recItem.className = 'ytm-media-item';
      recItem.innerHTML = '<a href="/watch?v=rec123">Recommendation</a>';
      mockDocument.body.appendChild(recItem);

      // Simulate touch on recommendation item
      recItem.dispatchEvent(new mockWindow.MouseEvent('click', { bubbles: true }));

      // __lastPauseButtonTapTime should NOT be set by a recommendation item
      expect(mockWindow.__lastPauseButtonTapTime).toBe(0);

      // Video pause should be suppressed!
      const video = mockDocument.querySelector('video');
      video.pause();
      expect(isPaused).toBe(false);
    });

    it('remote control PLAY command does not click toggle buttons and safely resumes playback', () => {
      isPaused = true;
      mockWindow.__isAppInBackground = true;
      mockWindow.__userWantsPaused = true;

      const playBtn = mockDocument.querySelector('.ytp-play-button');
      let playBtnClicked = false;
      playBtn.addEventListener('click', () => {
        playBtnClicked = true;
      });

      mockWindow.eval(getRemoteControlScript('PLAY'));

      // Video must resume via API, without synthetic click on toggle button
      expect(isPaused).toBe(false);
      expect(mockWindow.__userWantsPaused).toBe(false);
      expect(playBtnClicked).toBe(false);
    });

    it('suppresses pause on second minimize after reopening without pause button interaction', () => {
      // 1. App reopened into foreground
      mockWindow.__isAppInBackground = false;
      mockWindow.__windowHasBlur = false;
      mockWindow.__lastBlurTime = 0;
      mockWindow.__lastPauseButtonTapTime = 0;
      mockWindow.__lastPlayerInteractionTime = 0;
      mockWindow.__userWantsPaused = false;
      isPaused = false;

      // 2. Second minimize: user swipes home without tapping pause
      mockWindow.__isAppInBackground = true;
      mockWindow.__windowHasBlur = true;
      mockWindow.__lastBlurTime = Date.now();

      const video = mockDocument.querySelector('video');
      video.pause();

      // Video must NOT pause!
      expect(isPaused).toBe(false);
    });
  });
});

