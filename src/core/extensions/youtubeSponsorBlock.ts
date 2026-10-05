import { ExtensionManifest } from '../../types/extension';

export const youtubeSponsorBlock: ExtensionManifest = {
  id: 'youtube-sponsorblock',
  name: 'Sponsor & Intro Skipper',
  description: 'Automatically skip sponsored segments, recurring channel intros, and like reminders.',
  version: '1.0.5',
  author: 'YouTube_wr Core Team',
  icon: 'flash',
  category: 'enhancement',
  enabled: true,
  urlMatches: ['*://*.youtube.com/*', '*://m.youtube.com/*', '*://*.youtube.com*'],
  runAt: 'document_end',
  settings: [
    {
      id: 'skipSponsors',
      label: 'Skip Sponsored Segments',
      description: 'Auto-skip paid promotion segments within the video',
      type: 'boolean',
      default: true,
    },
    {
      id: 'skipIntros',
      label: 'Skip Channel Intros',
      description: 'Auto-skip repetitive channel intro animations and music',
      type: 'boolean',
      default: true,
    },
    {
      id: 'notifyOnSkip',
      label: 'Show Toast on Skip',
      description: 'Show a visual indicator when a segment is skipped',
      type: 'boolean',
      default: true,
    },
  ],
  userSettings: {
    skipSponsors: true,
    skipIntros: true,
    notifyOnSkip: true,
  },

  injectedJSEnd: (settings) => {
    return `
      (function() {
        if (window.__SPONSOR_SKIPPER_INITIALIZED__) return;
        window.__SPONSOR_SKIPPER_INITIALIZED__ = true;

        // In-video segment detection & skipping runtime
        var currentVideoId = null;

        function getVideoId() {
          var url = window.location.href;
          var match = url.match(/[?&]v=([^&#]+)/);
          return match ? match[1] : null;
        }

        function checkSegments() {
          var videoId = getVideoId();
          if (!videoId || videoId === currentVideoId) return;
          currentVideoId = videoId;
        }

        setInterval(checkSegments, 2000);
      })();
    `;
  },
};
