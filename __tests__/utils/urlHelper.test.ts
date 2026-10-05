import {
  extractVideoId,
  isLikelyUrl,
  formatNavUrl,
  getYouTubeSearchUrl,
} from '../../src/utils/urlHelper';

describe('urlHelper utilities', () => {
  describe('extractVideoId', () => {
    it('extracts video ID from standard watch URLs', () => {
      expect(extractVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s')).toBe('dQw4w9WgXcQ');
      expect(extractVideoId('https://youtube.com/watch?feature=shared&v=12345678901')).toBe('12345678901');
    });

    it('extracts video ID from Shorts URLs', () => {
      expect(extractVideoId('https://m.youtube.com/shorts/abcd1234efg')).toBe('abcd1234efg');
      expect(extractVideoId('https://www.youtube.com/shorts/abcd1234efg?feature=share')).toBe('abcd1234efg');
    });

    it('extracts video ID from embed URLs', () => {
      expect(extractVideoId('https://www.youtube.com/embed/embedId123')).toBe('embedId123');
    });

    it('returns null for non-video URLs or invalid strings', () => {
      expect(extractVideoId('https://m.youtube.com')).toBeNull();
      expect(extractVideoId('https://m.youtube.com/feed/subscriptions')).toBeNull();
      expect(extractVideoId('https://instagram.com')).toBeNull();
      expect(extractVideoId('')).toBeNull();
      expect(extractVideoId(null as any)).toBeNull();
      expect(extractVideoId(undefined as any)).toBeNull();
    });
  });

  describe('isLikelyUrl', () => {
    it('identifies explicit http/https URLs', () => {
      expect(isLikelyUrl('https://instagram.com')).toBe(true);
      expect(isLikelyUrl('http://insecure.site')).toBe(true);
    });

    it('identifies domain-like strings without protocol', () => {
      expect(isLikelyUrl('github.com')).toBe(true);
      expect(isLikelyUrl('sub.reddit.com/r/reactnative')).toBe(true);
      expect(isLikelyUrl('news.ycombinator.com')).toBe(true);
    });

    it('identifies search queries as not URLs', () => {
      expect(isLikelyUrl('best expo audio players')).toBe(false);
      expect(isLikelyUrl('hello world')).toBe(false);
      expect(isLikelyUrl('react')).toBe(false);
    });
  });

  describe('formatNavUrl', () => {
    it('preserves existing http/https URLs', () => {
      expect(formatNavUrl('https://x.com')).toBe('https://x.com');
      expect(formatNavUrl('http://example.com')).toBe('http://example.com');
    });

    it('prepends https:// to domains without protocol', () => {
      expect(formatNavUrl('reddit.com')).toBe('https://reddit.com');
      expect(formatNavUrl('twitch.tv/ninja')).toBe('https://twitch.tv/ninja');
    });

    it('converts plain search queries to Google search URLs', () => {
      expect(formatNavUrl('expo sdk 57 tutorials')).toBe(
        'https://www.google.com/search?q=expo%20sdk%2057%20tutorials'
      );
    });

    it('returns empty string on empty input', () => {
      expect(formatNavUrl('')).toBe('');
      expect(formatNavUrl('   ')).toBe('');
    });
  });

  describe('getYouTubeSearchUrl', () => {
    it('formats YouTube search query URL', () => {
      expect(getYouTubeSearchUrl('lofi hip hop')).toBe(
        'https://m.youtube.com/results?search_query=lofi%20hip%20hop'
      );
    });

    it('defaults to home on empty query', () => {
      expect(getYouTubeSearchUrl('')).toBe('https://m.youtube.com');
    });
  });
});
