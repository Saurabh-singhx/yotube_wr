import { youtubeDistractionFree } from '../../src/core/extensions/youtubeDistractionFree';

describe('Zen Mode / Distraction-Free - youtubeDistractionFree Extension', () => {
  it('has valid manifest configuration', () => {
    expect(youtubeDistractionFree.id).toBe('youtube-distraction-free');
    expect(youtubeDistractionFree.name).toContain('Zen Focus');
    expect(youtubeDistractionFree.category).toBe('ui');
    expect(youtubeDistractionFree.enabled).toBe(true);
    expect(youtubeDistractionFree.urlMatches).toEqual(
      expect.arrayContaining(['*://*.youtube.com/*', '*://m.youtube.com/*'])
    );
  });

  describe('injectedCSS', () => {
    it('generates rules to hide YouTube Shorts when hideShorts is true', () => {
      const css = typeof youtubeDistractionFree.injectedCSS === 'function'
        ? youtubeDistractionFree.injectedCSS({ hideShorts: true, hideComments: false, hideRelated: false, hideEndScreens: false })
        : '';
      expect(css).toContain('ytd-reel-shelf-renderer');
      expect(css).toContain('ytm-reel-shelf-renderer');
      expect(css).toContain('Shorts');
      expect(css).toContain('display: none !important');
    });

    it('generates rules to hide comments when hideComments is true', () => {
      const css = typeof youtubeDistractionFree.injectedCSS === 'function'
        ? youtubeDistractionFree.injectedCSS({ hideShorts: false, hideComments: true, hideRelated: false, hideEndScreens: false })
        : '';
      expect(css).toContain('comment');
      expect(css).toContain('display: none !important');
    });

    it('generates rules to hide related recommendations when hideRelated is true', () => {
      const css = typeof youtubeDistractionFree.injectedCSS === 'function'
        ? youtubeDistractionFree.injectedCSS({ hideShorts: false, hideComments: false, hideRelated: true, hideEndScreens: false })
        : '';
      expect(css).toContain('#related');
      expect(css).toContain('display: none !important');
    });

    it('generates rules to hide end screen cards when hideEndScreens is true', () => {
      const css = typeof youtubeDistractionFree.injectedCSS === 'function'
        ? youtubeDistractionFree.injectedCSS({ hideShorts: false, hideComments: false, hideRelated: false, hideEndScreens: true })
        : '';
      expect(css).toContain('.ytp-ce-element');
      expect(css).toContain('display: none !important');
    });

    it('returns empty string if all options are disabled', () => {
      const css = typeof youtubeDistractionFree.injectedCSS === 'function'
        ? youtubeDistractionFree.injectedCSS({ hideShorts: false, hideComments: false, hideRelated: false, hideEndScreens: false })
        : '';
      expect(css.trim()).toBe('');
    });
  });
});
