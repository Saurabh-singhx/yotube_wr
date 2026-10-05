import { ExtensionManifest } from '../../types/extension';

export const youtubeDistractionFree: ExtensionManifest = {
  id: 'youtube-distraction-free',
  name: 'Zen Focus / Distraction-Free',
  description: 'Hide addictive YouTube Shorts, comments, recommended video rabbit holes, and end screens.',
  version: '1.2.0',
  author: 'YouTube_wr Core Team',
  icon: 'leaf',
  category: 'ui',
  enabled: true,
  urlMatches: ['*://*.youtube.com/*', '*://m.youtube.com/*', '*://*.youtube.com*'],
  runAt: 'both',
  settings: [
    {
      id: 'hideShorts',
      label: 'Hide YouTube Shorts',
      description: 'Remove the Shorts tab, Shorts shelves, and reels from feeds',
      type: 'boolean',
      default: true,
    },
    {
      id: 'hideComments',
      label: 'Hide Comments Section',
      description: 'Block comments on videos to keep focus and avoid toxicity',
      type: 'boolean',
      default: false,
    },
    {
      id: 'hideRelated',
      label: 'Hide Related Video Feed',
      description: 'Removes the endless recommendations under videos',
      type: 'boolean',
      default: false,
    },
    {
      id: 'hideEndScreens',
      label: 'Hide End Screen Cards',
      description: 'Hides overlay video cards at the end of videos',
      type: 'boolean',
      default: true,
    },
  ],
  userSettings: {
    hideShorts: true,
    hideComments: false,
    hideRelated: false,
    hideEndScreens: true,
  },

  injectedCSS: (settings) => {
    let rules = '';

    if (settings.hideShorts !== false) {
      rules += `
        /* Hide Shorts tabs, shelf and grid items */
        ytd-reel-shelf-renderer,
        ytm-reel-shelf-renderer,
        ytd-rich-shelf-renderer[is-shorts],
        ytm-pivot-bar-item-renderer[aria-label*="Shorts"],
        ytd-guide-entry-renderer a[title="Shorts"],
        ytd-mini-guide-entry-renderer[aria-label="Shorts"],
        ytd-rich-item-renderer:has(a[href*="/shorts/"]),
        ytm-video-with-context-renderer:has(a[href*="/shorts/"]) {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
        }
      `;
    }

    if (settings.hideComments === true) {
      rules += `
        /* Hide Comments */
        ytd-comments,
        #comments,
        ytm-comments-entry-point-header-renderer,
        ytm-item-section-renderer[section-identifier="comment-item-section"] {
          display: none !important;
        }
      `;
    }

    if (settings.hideRelated === true) {
      rules += `
        /* Hide Recommended / Related Videos */
        #related,
        ytd-watch-next-secondary-results-renderer,
        ytm-item-section-renderer[section-identifier="related-items"] {
          display: none !important;
        }
      `;
    }

    if (settings.hideEndScreens !== false) {
      rules += `
        /* Hide End-screen video cards */
        .ytp-ce-element,
        .ytp-cards-teaser,
        .ytp-cards-button {
          display: none !important;
        }
      `;
    }

    return rules;
  },
};
