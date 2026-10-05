import { ExtensionManifest } from '../../types/extension';

export const youtubeAdBlocker: ExtensionManifest = {
  id: 'youtube-adblocker',
  name: 'AdShield Pro for YouTube',
  description: 'Eliminates video ads, black screen stalls, sponsored feed items, and tracker requests.',
  version: '2.5.0',
  author: 'YouTube_wr Core Team',
  icon: 'shield-checkmark',
  category: 'adblock',
  enabled: true,
  urlMatches: ['*://*.youtube.com/*', '*://m.youtube.com/*'],
  runAt: 'both',
  settings: [
    {
      id: 'blockVideoAds',
      label: 'Fast-Forward & Skip Video Ads',
      description: 'Auto-skips pre-roll and mid-roll ads without black screen stalls',
      type: 'boolean',
      default: true,
    },
    {
      id: 'blockBanners',
      label: 'Hide Banners & Promoted Feeds',
      description: 'Cosmetically hides promoted banners and search ads',
      type: 'boolean',
      default: true,
    },
    {
      id: 'interceptNetwork',
      label: 'Network Ad Interceptor',
      description: 'Blocks Google ad servers and tracking requests',
      type: 'boolean',
      default: true,
    },
    {
      id: 'muteDuringAd',
      label: 'Mute Ad Audio',
      description: 'Silences audio during transition skip',
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
  // NOTE: Never hide .video-ads or .ytp-ad-module with display:none, as doing so
  // causes YouTube's video player to render a pitch black box!
  injectedCSS: (settings) => {
    if (settings.blockBanners === false) return '';
    return `
      /* YouTube Web and Mobile Banners / In-Feed Ads Filter */
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

        // Block only external Google ad network domains.
        // DO NOT block internal YouTube playback/stats endpoints as doing so triggers YouTube anti-adblock black screens!
        var AD_DOMAINS = [
          'googleads.g.doubleclick.net',
          'pagead2.googlesyndication.com',
          'pubads.g.doubleclick.net',
          'securepubads.g.doubleclick.net',
          'adservice.google.com'
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

            var response = await originalFetch.apply(this, arguments);

            // Safely scrub ad placements from player configuration without breaking the response format
            if (urlString && urlString.indexOf('youtubei/v1/player') !== -1) {
              try {
                var clone = response.clone();
                var data = await clone.json();
                if (data && (data.adPlacements || data.playerAds || data.adSlots)) {
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

  // Document End: Player video ad skipper & black screen resolver
  injectedJSEnd: (settings) => {
    if (settings.blockVideoAds === false) return '';
    const muteAd = settings.muteDuringAd !== false;

    return `
      (function() {
        if (window.__AD_SKIPPER_INITIALIZED__) return;
        window.__AD_SKIPPER_INITIALIZED__ = true;

        var wasAdShowing = false;
        var originalMuted = false;
        var originalRate = 1.0;
        var lastNotifyTime = 0;

        function runSkipper() {
          var video = document.querySelector('video');
          var player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
          var isAd = false;

          // 1. Check if ad-showing or ad-interrupting class is on the player
          if (player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'))) {
            isAd = true;
          }

          // 2. Check for skip button presence
          var skipBtn = document.querySelector(
            '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button-slot button, .ytp-ad-overlay-close-button'
          );
          if (skipBtn) {
            isAd = true;
          }

          if (isAd && video) {
            if (!wasAdShowing) {
              wasAdShowing = true;
              originalMuted = video.muted;
              originalRate = video.playbackRate && video.playbackRate <= 4 ? video.playbackRate : 1.0;
            }

            // Immediately click skip button if available
            if (skipBtn) {
              try { skipBtn.click(); } catch(e) {}
            }

            // Call native player skipAd API if accessible
            if (player && typeof player.skipAd === 'function') {
              try { player.skipAd(); } catch(e) {}
            }

            // Mute audio during ad
            if (${muteAd}) {
              video.muted = true;
            }

            // Accelerate playback speed to 16x so the ad finishes in milliseconds
            video.playbackRate = 16.0;

            // If the video is paused (which happens when black screen stalls occur), trigger play!
            if (video.paused) {
              try { video.play().catch(function(){}); } catch(e) {}
            }

            // Advance current time near the end of the ad to avoid infinite buffer wait
            if (isFinite(video.duration) && video.duration > 0.5) {
              if (video.currentTime < video.duration - 0.15) {
                video.currentTime = video.duration - 0.1;
              }
            }

            var now = Date.now();
            if (now - lastNotifyTime > 1500) {
              lastNotifyTime = now;
              if (window.__RN_EXTENSION_BRIDGE__) {
                window.__RN_EXTENSION_BRIDGE__.send('youtube-adblocker', 'AD_BLOCKED', {
                  source: 'video_ad_skip'
                });
              }
            }
          } else if (wasAdShowing) {
            // AD FINISHED: Restore original video settings immediately!
            wasAdShowing = false;
            if (video) {
              video.playbackRate = originalRate;
              video.muted = originalMuted;
              if (video.paused) {
                try { video.play().catch(function(){}); } catch(e) {}
              }
            }
          }

          // Auto-dismiss any anti-adblock dialogs or prompts
          var dismissBtn = document.querySelector(
            'tp-yt-paper-dialog #dismiss-button, ytd-enforcement-message-view-model button, #feedback-undo'
          );
          if (dismissBtn) {
            try { dismissBtn.click(); } catch(e) {}
          }
        }

        // Run interval watcher every 100ms
        setInterval(runSkipper, 100);

        // Also hook on video events
        document.addEventListener('timeupdate', function(e) {
          if (e.target && e.target.tagName === 'VIDEO') {
            runSkipper();
          }
        }, true);
      })();
    `;
  },
};
