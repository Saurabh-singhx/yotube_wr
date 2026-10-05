import { ExtensionManifest } from '../../types/extension';

export const youtubeAdBlocker: ExtensionManifest = {
  id: 'youtube-adblocker',
  name: 'AdShield Pro for YouTube',
  description: 'Blocks video pre-roll & mid-roll ads, banners, sponsored feed items, and tracker requests.',
  version: '2.4.0',
  author: 'YouTube_wr Core Team',
  icon: 'shield-checkmark',
  category: 'adblock',
  enabled: true,
  urlMatches: ['*://*.youtube.com/*', '*://m.youtube.com/*'],
  runAt: 'both',
  settings: [
    {
      id: 'blockVideoAds',
      label: 'Skip Video Ads Instantly',
      description: 'Auto-skips pre-roll and mid-roll video ads immediately',
      type: 'boolean',
      default: true,
    },
    {
      id: 'blockBanners',
      label: 'Hide Banners & Promoted Feeds',
      description: 'Cosmetically hides promoted items, banners, and search ads',
      type: 'boolean',
      default: true,
    },
    {
      id: 'interceptNetwork',
      label: 'Network Ad Interceptor',
      description: 'Intercepts and blocks background ad tracking and Google ad servers',
      type: 'boolean',
      default: true,
    },
    {
      id: 'muteDuringAd',
      label: 'Mute Ad Audio',
      description: 'Silences ad audio during transition skip',
      type: 'boolean',
      default: true,
    },
  ],
  userSettings: {
    blockVideoAds: true,
    blockBanners: true,
    interceptNetwork: true,
    muteDuringAd: true,
  },

  // Injected CSS for cosmetic filtering
  injectedCSS: (settings) => {
    if (settings.blockBanners === false) return '';
    return `
      /* YouTube Web and Mobile Ad CSS Filter */
      .ytp-ad-module,
      .ytp-ad-overlay-container,
      .ytp-ad-message-container,
      .video-ads,
      .ytp-ad-progress-list,
      .ytp-suggested-action-badge,
      ytd-promoted-sparkles-web-renderer,
      ytm-promoted-sparkles-web-renderer,
      ytd-display-ad-renderer,
      ytm-promoted-video-renderer,
      ytd-banner-promo-renderer,
      ytd-statement-banner-renderer,
      ytd-in-feed-ad-layout-renderer,
      ytm-in-feed-ad-layout-renderer,
      #player-ads,
      .ytd-search-pyv-renderer,
      ytm-companion-slot,
      yt-mealbar-promo-renderer,
      ytd-ad-slot-renderer,
      ytm-ad-slot-renderer,
      ytm-paid-content-overlay-renderer,
      #masthead-ad,
      ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
      ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer),
      ytm-item-section-renderer[section-identifier="comment-item-section"] + ytm-promoted-sparkles-web-renderer,
      div#ad-banner,
      div[id^="ad_"],
      .ad-container,
      .ad-div {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        max-height: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
  },

  // Document Start: Network request interceptor (fetch & XHR)
  injectedJSStart: (settings) => {
    if (settings.interceptNetwork === false) return '';
    return `
      (function() {
        if (window.__AD_INTERCEPTOR_INITIALIZED__) return;
        window.__AD_INTERCEPTOR_INITIALIZED__ = true;

        var AD_DOMAINS = [
          'googleads.g.doubleclick.net',
          'pagead2.googlesyndication.com',
          'pubads.g.doubleclick.net',
          'securepubads.g.doubleclick.net',
          'adservice.google.com',
          'youtube.com/api/stats/ads',
          'youtube.com/pagead/',
          'youtube.com/ptracking',
          'api/stats/qoe?adformat'
        ];

        function isAdUrl(url) {
          if (!url || typeof url !== 'string') return false;
          for (var i = 0; i < AD_DOMAINS.length; i++) {
            if (url.indexOf(AD_DOMAINS[i]) !== -1) return true;
          }
          return false;
        }

        function notifyBlocked(url, type) {
          if (window.__RN_EXTENSION_BRIDGE__) {
            window.__RN_EXTENSION_BRIDGE__.send('youtube-adblocker', 'AD_BLOCKED', {
              source: type || 'network',
              url: (url || '').substring(0, 100)
            });
          }
        }

        // Monkey-patch window.fetch
        var originalFetch = window.fetch;
        if (originalFetch) {
          window.fetch = async function() {
            var url = arguments[0];
            var urlString = typeof url === 'string' ? url : (url && url.url ? url.url : '');

            if (isAdUrl(urlString)) {
              notifyBlocked(urlString, 'fetch');
              return new Response(JSON.stringify({}), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              });
            }

            // Scrub player config ads
            var response = await originalFetch.apply(this, arguments);
            if (urlString && urlString.indexOf('youtubei/v1/player') !== -1) {
              try {
                var clone = response.clone();
                var data = await clone.json();
                if (data.adPlacements || data.playerAds || data.adSlots) {
                  delete data.adPlacements;
                  delete data.playerAds;
                  delete data.adSlots;
                  notifyBlocked(urlString, 'player_scrub');
                  return new Response(JSON.stringify(data), {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers
                  });
                }
              } catch(e) {}
            }
            return response;
          };
        }

        // Monkey-patch XMLHttpRequest
        var originalOpen = XMLHttpRequest.prototype.open;
        var originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function(method, url) {
          this.__url = url;
          return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function() {
          if (isAdUrl(this.__url)) {
            notifyBlocked(this.__url, 'xhr');
            Object.defineProperty(this, 'readyState', { value: 4 });
            Object.defineProperty(this, 'status', { value: 200 });
            Object.defineProperty(this, 'responseText', { value: '{}' });
            if (typeof this.onreadystatechange === 'function') {
              this.onreadystatechange();
            }
            if (typeof this.onload === 'function') {
              this.onload();
            }
            return;
          }
          return originalSend.apply(this, arguments);
        };
      })();
    `;
  },

  // Document End: Player video ad skipper & DOM observer
  injectedJSEnd: (settings) => {
    if (settings.blockVideoAds === false) return '';
    const muteAd = settings.muteDuringAd !== false;

    return `
      (function() {
        if (window.__AD_SKIPPER_INITIALIZED__) return;
        window.__AD_SKIPPER_INITIALIZED__ = true;

        var lastAdSkipTime = 0;

        function checkAndSkipAds() {
          var video = document.querySelector('video');
          var player = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
          var isAdShowing = false;

          // Check if ad classes exist on player
          if (player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'))) {
            isAdShowing = true;
          }

          // Check for overlay or skip button presence
          var skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-overlay-close-button');
          if (skipBtn) {
            isAdShowing = true;
          }

          if (video && isAdShowing) {
            // Silence ad audio
            if (${muteAd}) {
              video.muted = true;
            }

            // Immediately fast forward or jump to end of ad
            if (isFinite(video.duration) && video.duration > 0) {
              video.currentTime = video.duration - 0.05;
            } else {
              video.playbackRate = 16.0;
            }

            // Click skip button if available
            if (skipBtn) {
              skipBtn.click();
            }

            var now = Date.now();
            if (now - lastAdSkipTime > 1500) {
              lastAdSkipTime = now;
              if (window.__RN_EXTENSION_BRIDGE__) {
                window.__RN_EXTENSION_BRIDGE__.send('youtube-adblocker', 'AD_BLOCKED', {
                  source: 'video_ad_skip'
                });
              }
            }
          }
        }

        // Run interval watcher
        setInterval(checkAndSkipAds, 200);

        // Also hook on video play/timeupdate
        document.addEventListener('timeupdate', function(e) {
          if (e.target && e.target.tagName === 'VIDEO') {
            checkAndSkipAds();
          }
        }, true);
      })();
    `;
  },
};
