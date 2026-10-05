import { youtubeSponsorBlock } from '../../src/core/extensions/youtubeSponsorBlock';

describe('SponsorBlock - youtubeSponsorBlock Extension', () => {
  it('has valid manifest configuration', () => {
    expect(youtubeSponsorBlock.id).toBe('youtube-sponsorblock');
    expect(youtubeSponsorBlock.name).toContain('Sponsor');
    expect(youtubeSponsorBlock.category).toBe('enhancement');
    expect(youtubeSponsorBlock.enabled).toBe(true);
    expect(youtubeSponsorBlock.urlMatches).toEqual(
      expect.arrayContaining(['*://*.youtube.com/*', '*://m.youtube.com/*'])
    );
  });

  describe('injectedJSEnd', () => {
    it('generates the sponsor skipper runtime script', () => {
      const js = typeof youtubeSponsorBlock.injectedJSEnd === 'function'
        ? youtubeSponsorBlock.injectedJSEnd({ skipSponsors: true })
        : '';
      expect(js).toContain('__SPONSOR_SKIPPER_INITIALIZED__');
      expect(js).toContain('getVideoId');
    });
  });
});
