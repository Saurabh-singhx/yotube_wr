import { ExtensionManifest } from '../../types/extension';

export const youtubeAutoHD: ExtensionManifest = {
  id: 'youtube-auto-hd',
  name: 'Auto High Quality (Max Resolution)',
  description: 'Locks video playback to the highest resolution available (1080p, 1440p, 4K) so you never get stuck in 360p or 480p.',
  version: '1.0.0',
  author: 'YouTube_wr Core Team',
  icon: 'videocam',
  category: 'playback',
  enabled: true,
  urlMatches: ['*://*.youtube.com/*', '*://m.youtube.com/*', '*://*.youtube.com*'],
  runAt: 'both',
  settings: [
    {
      id: 'forceMaxResolution',
      label: 'Force Max Available Resolution',
      description: 'Automatically selects 4K, 1440p, 1080p or the maximum quality the video offers',
      type: 'boolean',
      default: true,
    },
    {
      id: 'persistQualityPref',
      label: 'Save Preference in YouTube',
      description: 'Pre-configures YouTube player local storage to always default to HD',
      type: 'boolean',
      default: true,
    },
  ],
  userSettings: {
    forceMaxResolution: true,
    persistQualityPref: true,
  },

  injectedJSStart: () => {
    return `
      (function() {
        // Pre-configure YouTube player storage for high quality before page scripts boot
        try {
          localStorage.setItem('yt-player-quality', JSON.stringify({
            data: 'highres',
            creation: Date.now(),
            expiration: Date.now() + 31536000000
          }));
        } catch(e) {}
      })();
    `;
  },

  injectedJSEnd: (settings) => {
    if (settings.forceMaxResolution === false) return '';

    return `
      (function() {
        if (window.__AUTO_HD_INITIALIZED__) return;
        window.__AUTO_HD_INITIALIZED__ = true;

        var lastProcessedVideoId = null;
        var attemptsForCurrentVideo = 0;

        function getVideoId() {
          var url = window.location.href;
          var match = url.match(/[?&]v=([^&#]+)/);
          return match ? match[1] : null;
        }

        function enforceMaxQuality() {
          var videoId = getVideoId();
          if (!videoId) return;

          var video = document.querySelector('video');
          // Wait until video has begun playback so we don't abort the initial startup buffer
          if (video && video.paused && !video.ended) return;

          if (videoId !== lastProcessedVideoId) {
            lastProcessedVideoId = videoId;
            attemptsForCurrentVideo = 0;
          }

          // Limit attempts to avoid excessive overhead once locked
          if (attemptsForCurrentVideo >= 8) return;

          var player = document.getElementById('movie_player') ||
                       document.getElementById('player') ||
                       document.querySelector('.html5-video-player') ||
                       (document.querySelector('video') ? document.querySelector('video').closest('.html5-video-player, #player, .player-container') : null);
          if (!player) return;

          if (typeof player.getAvailableQualityLevels === 'function') {
            var levels = player.getAvailableQualityLevels();
            if (levels && levels.length > 0) {
              // Mobile-optimized quality selection: prioritize crisp 1080p/720p without buffering stalls
              var targetQuality = null;
              var preferred = ['hd1080', 'hd720', 'large', 'medium', 'highres', 'hd1440'];
              for (var p = 0; p < preferred.length; p++) {
                if (levels.indexOf(preferred[p]) !== -1) {
                  targetQuality = preferred[p];
                  break;
                }
              }
              if (!targetQuality) {
                targetQuality = levels[0];
              }

              if (targetQuality) {
                var currentQuality = typeof player.getPlaybackQuality === 'function' ? player.getPlaybackQuality() : null;
                if (currentQuality !== targetQuality) {
                  if (typeof player.setPlaybackQualityRange === 'function') {
                    player.setPlaybackQualityRange(targetQuality, targetQuality);
                  }
                  if (typeof player.setPlaybackQuality === 'function') {
                    player.setPlaybackQuality(targetQuality);
                  }
                }
                attemptsForCurrentVideo++;
              }
            }
          }
        }

        // Run when video elements become active or play
        document.addEventListener('play', function(e) {
          if (e.target && e.target.tagName === 'VIDEO') {
            setTimeout(enforceMaxQuality, 800);
            setTimeout(enforceMaxQuality, 2000);
          }
        }, true);

        // Run on SPA navigation
        window.addEventListener('yt-navigate-finish', function() {
          lastProcessedVideoId = null;
          attemptsForCurrentVideo = 0;
          setTimeout(enforceMaxQuality, 1000);
          setTimeout(enforceMaxQuality, 2500);
          setTimeout(enforceMaxQuality, 4000);
        });

        // Periodic light check
        setInterval(enforceMaxQuality, 2000);
      })();
    `;
  },
};
