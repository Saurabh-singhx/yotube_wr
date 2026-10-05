/**
 * @jest-environment jsdom
 */
import { youtubeAutoHD } from '../../src/core/extensions/youtubeAutoHD';

describe('Auto High Quality (Auto HD) - youtubeAutoHD Extension', () => {
  it('has valid manifest configuration', () => {
    expect(youtubeAutoHD.id).toBe('youtube-auto-hd');
    expect(youtubeAutoHD.name).toContain('Auto High Quality');
    expect(youtubeAutoHD.category).toBe('playback');
    expect(youtubeAutoHD.enabled).toBe(true);
    expect(youtubeAutoHD.urlMatches).toEqual(
      expect.arrayContaining(['*://*.youtube.com/*', '*://m.youtube.com/*'])
    );
  });

  describe('injectedJSStart (Pre-configuration)', () => {
    it('seeds localStorage with highres quality preference', () => {
      const js = typeof youtubeAutoHD.injectedJSStart === 'function'
        ? youtubeAutoHD.injectedJSStart({})
        : '';
      expect(js).toContain("localStorage.setItem('yt-player-quality'");
      expect(js).toContain('highres');
    });
  });

  describe('injectedJSEnd (Player Quality Enforcement)', () => {
    it('returns empty string if forceMaxResolution is disabled', () => {
      const js = typeof youtubeAutoHD.injectedJSEnd === 'function'
        ? youtubeAutoHD.injectedJSEnd({ forceMaxResolution: false })
        : '';
      expect(js).toBe('');
    });

    it('generates enforcement script targeting highest quality', () => {
      const js = typeof youtubeAutoHD.injectedJSEnd === 'function'
        ? youtubeAutoHD.injectedJSEnd({ forceMaxResolution: true })
        : '';
      expect(js).toContain('__AUTO_HD_INITIALIZED__');
      expect(js).toContain('getAvailableQualityLevels');
      expect(js).toContain('setPlaybackQualityRange');
      expect(js).toContain('movie_player');
      expect(js).toContain('player');
    });

    it('locks maximum resolution when player is ready in simulated DOM', () => {
      jest.useFakeTimers();

      // Mock window location
      Object.defineProperty(window, 'location', {
        value: { href: 'https://m.youtube.com/watch?v=dQw4w9WgXcQ' },
        writable: true,
      });

      (window as any).__AUTO_HD_INITIALIZED__ = false;

      // Mock player
      const player = document.createElement('div');
      player.id = 'player';
      (player as any).getAvailableQualityLevels = jest.fn().mockReturnValue([
        'hd1080',
        'hd720',
        'large',
        'medium',
        'small',
        'auto'
      ]);
      (player as any).getPlaybackQuality = jest.fn().mockReturnValue('medium');
      (player as any).setPlaybackQualityRange = jest.fn();
      document.body.appendChild(player);

      const scriptCode = typeof youtubeAutoHD.injectedJSEnd === 'function'
        ? youtubeAutoHD.injectedJSEnd({ forceMaxResolution: true })
        : '';
      eval(scriptCode!);

      // Fast forward interval (1500ms)
      jest.advanceTimersByTime(2000);

      expect((player as any).setPlaybackQualityRange).toHaveBeenCalledWith('hd1080', 'hd1080');

      jest.useRealTimers();
    });
  });
});
