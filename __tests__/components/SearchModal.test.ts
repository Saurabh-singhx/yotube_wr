import { FEATURED_WEBAPPS } from '../../src/components/SearchModal';
import { formatNavUrl, isLikelyUrl, getYouTubeSearchUrl } from '../../src/utils/urlHelper';

describe('SearchModal & WebApps Hub', () => {
  describe('FEATURED_WEBAPPS Catalog', () => {
    it('contains all essential webapps including Instagram, X, Reddit, TikTok, Twitch, and YouTube', () => {
      const ids = FEATURED_WEBAPPS.map((w) => w.id);
      expect(ids).toContain('instagram');
      expect(ids).toContain('instagram-dms');
      expect(ids).toContain('instagram-reels');
      expect(ids).toContain('x');
      expect(ids).toContain('reddit');
      expect(ids).toContain('tiktok');
      expect(ids).toContain('twitch');
      expect(ids).toContain('youtube');
      expect(ids).toContain('github');
      expect(ids).toContain('google');
      expect(ids).toContain('soundcloud');
    });

    it('each webapp has valid https URL, unique id, name, and visual theme color', () => {
      const ids = new Set<string>();
      FEATURED_WEBAPPS.forEach((app) => {
        expect(ids.has(app.id)).toBe(false);
        ids.add(app.id);
        expect(app.url.startsWith('https://')).toBe(true);
        expect(app.name.length).toBeGreaterThan(0);
        expect(app.color.startsWith('#')).toBe(true);
        expect(app.icon.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Search & Navigation Flow', () => {
    it('handles direct webapp URL selection', () => {
      const instagram = FEATURED_WEBAPPS.find((w) => w.id === 'instagram');
      expect(instagram?.url).toBe('https://www.instagram.com');

      const onNavigate = jest.fn();
      onNavigate(instagram!.url);
      expect(onNavigate).toHaveBeenCalledWith('https://www.instagram.com');
    });

    it('handles direct URL navigation for entered domains', () => {
      const onNavigate = jest.fn();
      const input = 'reddit.com/r/reactnative';
      const formatted = formatNavUrl(input);

      onNavigate(formatted);
      expect(onNavigate).toHaveBeenCalledWith('https://reddit.com/r/reactnative');
    });

    it('handles arbitrary text queries as Google web searches', () => {
      const onNavigate = jest.fn();
      const input = 'expo sdk 57 release notes';
      const formatted = formatNavUrl(input);

      onNavigate(formatted);
      expect(onNavigate).toHaveBeenCalledWith(
        'https://www.google.com/search?q=expo%20sdk%2057%20release%20notes'
      );
    });

    it('handles YouTube search query formatting', () => {
      const onNavigate = jest.fn();
      const query = 'rick astley';
      const searchUrl = getYouTubeSearchUrl(query);

      onNavigate(searchUrl);
      expect(onNavigate).toHaveBeenCalledWith(
        'https://m.youtube.com/results?search_query=rick%20astley'
      );
    });
  });
});
