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

    it('intercepts and suppresses visibilitychange and pagehide listeners', () => {
      const script = getBackgroundPlayScript();
      expect(script).toContain("type === 'visibilitychange'");
      expect(script).toContain("type === 'webkitvisibilitychange'");
      expect(script).toContain("type === 'pagehide'");
      expect(script).toContain('EventTarget.prototype.addEventListener');
      expect(script).toContain('swallowEvent');
    });

    it('tracks user gestures and intercepts HTMLMediaElement pause to prevent automated background pause', () => {
      const script = getBackgroundPlayScript();
      expect(script).toContain('window.__lastUserGestureTime');
      expect(script).toContain('window.__userWantsPaused');
      expect(script).toContain('HTMLMediaElement.prototype.pause');
      expect(script).toContain('HTMLMediaElement.prototype.play');
    });

    it('sets up navigator.mediaSession bridge and interceptors', () => {
      const script = getBackgroundPlayScript();
      expect(script).toContain('window.navigator.mediaSession');
      expect(script).toContain('window.__ytwrMediaActions');
      expect(script).toContain('METADATA_UPDATE');
      expect(script).toContain('PLAYBACK_STATE_UPDATE');
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
});
