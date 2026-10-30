/**
 * Utilities for URL extraction, classification, and formatting
 */

export function extractVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const watchMatch = url.match(/[?&]v=([^&#]+)/);
  if (watchMatch) return watchMatch[1];
  const shortsMatch = url.match(/\/shorts\/([^&#/?]+)/);
  if (shortsMatch) return shortsMatch[1];
  const embedMatch = url.match(/\/embed\/([^&#/?]+)/);
  if (embedMatch) return embedMatch[1];
  return null;
}

export function isLikelyUrl(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    (trimmed.includes('.') && !trimmed.includes(' '))
  );
}

export function formatNavUrl(target: string): string {
  const url = target.trim();
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.includes('.') && !url.includes(' ')) {
    return 'https://' + url;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
}

export function getYouTubeSearchUrl(query: string): string {
  const text = query.trim();
  if (!text) return 'https://m.youtube.com';
  return `https://m.youtube.com/results?search_query=${encodeURIComponent(text)}`;
}
