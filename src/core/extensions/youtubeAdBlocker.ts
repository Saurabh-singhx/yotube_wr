import { ExtensionManifest } from '../../types/extension';

export const youtubeAdBlocker: ExtensionManifest = {
  id: 'youtube-adblocker',
  name: 'AdShield Pro for YouTube',
  description: 'Instantly skips video ads, eliminates black screen stalls, and hides banner promotions.',
  version: '3.2.0',
  author: 'YouTube_wr Core Team',
  icon: 'shield-checkmark',
  category: 'adblock',
  enabled: true,
  urlMatches: ['*://*.youtube.com/*', '*://m.youtube.com/*', '*://*.youtube.com*'],
  runAt: 'both',
  settings: [
    {
      id: 'blockVideoAds',
      label: 'Instant Video Ad Skip',
      description: 'Auto-skips pre-roll and mid-roll video ads in milliseconds',
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
    muteDuringAd: true,
  },

  // Injected CSS for cosmetic filtering
  // CAUTION: Never hide .video-ads, .ytp-ad-module, [id^="ad_"], or .ad-container!
  // Doing so hides the actual video player surface, rendering a pitch black box!
  injectedCSS: (settings) => {
    if (settings.blockBanners === false) return '';
    return `
      /* YouTube Web and Mobile Feed & Banner Ads Filter */
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
      /* YouTube Mobile "Open App" / App Banner Popups & Buttons */
      ytm-open-app-button-renderer,
      .ytm-open-app-button-renderer,
      ytm-pivot-bar-renderer ytm-open-app-button-renderer,
      ytm-app-banner,
      .ytm-app-banner,
      .open-app-button,
      button[aria-label*="open app" i],
      a[aria-label*="open app" i],
      a[href*="app_banner"],
      ytm-upsell-dialog-renderer,
      .ytm-upsell-dialog-renderer,
      .upsell-dialog-renderer {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        max-height: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
  },

  // Document Start: Strip ad configurations at the data level before YouTube player schedules them
  injectedJSStart: () => {
    return `
      (function() {
        if (window.__AD_INTERCEPT_LOADED__) return;
        window.__AD_INTERCEPT_LOADED__ = true;

        // Ensure clean window state without monkey-patching native fetch or JSON.parse
        // (tampering with fetch/JSON.parse triggers YouTube player validation errors and auto-pause)
        try {
          var _initialResp = window.ytInitialPlayerResponse;
          Object.defineProperty(window, 'ytInitialPlayerResponse', {
            get: function() { return _initialResp; },
            set: function(val) { _initialResp = val; },
            configurable: true
          });
        } catch(e) {}
      })();
    `;
  },

  // Document End: High-speed Ad Fast-Forward & Skip Engine
  injectedJSEnd: (settings) => {
    if (settings.blockVideoAds === false) return '';
    const muteAd = settings.muteDuringAd !== false;

    return `
      (function() {
        if (window.__AD_SKIPPER_ACTIVE__) return;
        window.__AD_SKIPPER_ACTIVE__ = true;

        var wasAdActive = false;
        var hasJumpedThisAd = false;
        var currentAdSrc = '';
        var savedVolume = 1;
        var savedMuted = false;
        var savedPlaybackRate = 1.0;
        var lastReportTime = 0;
        var lastRunTime = 0;
        var isPlayingAd = false;

        function isVisible(el) {
          if (!el) return false;
          var isJSDOM = typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.indexOf('jsdom') !== -1;
          if (isJSDOM) {
            var s = window.getComputedStyle ? window.getComputedStyle(el) : null;
            return !s || (s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0');
          }
          var style = window.getComputedStyle ? window.getComputedStyle(el) : null;
          if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) {
            return false;
          }
          return !!(el.offsetWidth || el.offsetHeight || (el.getClientRects && el.getClientRects().length > 0));
        }

        function findPlayer(video) {
          return document.getElementById('movie_player') ||
                 document.getElementById('player') ||
                 document.querySelector('.html5-video-player') ||
                 (video ? video.closest('.html5-video-player, #player, .player-container') : null);
        }

        function checkIsAd(video, player) {
          if (!player) player = findPlayer(video);

          // 1. YouTube player class indicators strictly on player container
          if (player) {
            var cls = player.className || '';
            if (cls.indexOf('ad-showing') !== -1 || cls.indexOf('ad-interrupting') !== -1) {
              return true;
            }

            // Visible ad overlays strictly inside player
            var adOverlay = player.querySelector('.ytp-ad-player-overlay, .ytp-ad-badge, .ytp-ad-duration-remaining');
            if (adOverlay && isVisible(adOverlay)) {
              return true;
            }

            // Native player API checks
            try {
              if (typeof player.isAdShowing === 'function' && player.isAdShowing()) {
                return true;
              }
              if (typeof player.getAdState === 'function' && player.getAdState() > 0) {
                return true;
              }
            } catch(e) {}
          }

          // 2. Video src query parameter indicators (distinct ad streams)
          if (video && video.src && (video.src.indexOf('adformat=') !== -1 || video.src.indexOf('&ctier=') !== -1)) {
            return true;
          }

          return false;
        }

        function clickSkipButtons() {
          var skipSelectors = [
            '.ytp-ad-skip-button',
            '.ytp-ad-skip-button-modern',
            '.ytp-skip-ad-button',
            '.ytp-ad-skip-button-container button',
            '.ytp-ad-skip-button-slot button',
            'button[class*="ytp-ad-skip"]',
            'button[class*="skip-button"]',
            'button[class*="ad-skip"]',
            '.ytp-ad-overlay-close-button',
            '.ytm-ad-skip-button',
            'button.yt-spec-button-shape-next[aria-label*="skip ad" i]',
            'button.yt-spec-button-shape-next[aria-label*="skip ads" i]'
          ];
          for (var s = 0; s < skipSelectors.length; s++) {
            var skipButtons = document.querySelectorAll(skipSelectors[s]);
            for (var i = 0; i < skipButtons.length; i++) {
              var btn = skipButtons[i];
              if (isVisible(btn)) {
                try {
                  btn.click();
                } catch(e) {}
              }
            }
          }
        }

        function dismissWarnings() {
          if (typeof document === 'undefined' || !document.querySelector) return;
          try {
            var dismissBtn = document.querySelector(
              'tp-yt-paper-dialog #dismiss-button, ytd-enforcement-message-view-model button, #feedback-undo, ' +
              '#consent-bump button, ytd-consent-bump-v2-lightbox button, .eom-button-row button, ' +
              'ytm-upsell-dialog-renderer button, button[aria-label*="Agree" i], button[aria-label*="Accept" i], ' +
              'button[aria-label*="Reject all" i], button[aria-label*="Dismiss" i]'
            );
            if (dismissBtn) {
              dismissBtn.click();
            }
            var backdrop = document.querySelector('tp-yt-iron-overlay-backdrop');
            if (backdrop && backdrop.getAttribute('opened') !== null) {
              backdrop.removeAttribute('opened');
              try { backdrop.remove(); } catch(e) {}
            }
          } catch(e) {}
        }

        function runAdSkipper() {
          var now = Date.now();
          if (lastRunTime && now - lastRunTime < 25) return;
          lastRunTime = now;

          if (typeof document === 'undefined' || !document.querySelectorAll) return;

          dismissWarnings();

          var videos = document.querySelectorAll('video');
          if (!videos || videos.length === 0) return;

          for (var vIdx = 0; vIdx < videos.length; vIdx++) {
            var video = videos[vIdx];
            var player = findPlayer(video);
            var isAd = checkIsAd(video, player);

            if (isAd) {
              if (!wasAdActive) {
                wasAdActive = true;
                hasJumpedThisAd = false;
                currentAdSrc = video.src || '';
                savedMuted = video.muted;
                savedVolume = video.volume > 0 ? video.volume : 1;
                savedPlaybackRate = (video.playbackRate && video.playbackRate <= 4) ? video.playbackRate : 1.0;
              }

              // If ad stream changed (e.g. ad 1 of 2 -> ad 2 of 2), reset jump flag
              if (video.src && video.src !== currentAdSrc) {
                currentAdSrc = video.src;
                hasJumpedThisAd = false;
              }

              // Mute ad audio only if not already muted
              if (${muteAd}) {
                if (!video.muted) video.muted = true;
                if (video.volume !== 0) video.volume = 0;
              }

              // Click any skip button immediately
              clickSkipButtons();

              // Call native player API if present (skipAd only, never cancelPlayback which kills video pipeline)
              if (player) {
                try {
                  if (typeof player.skipAd === 'function') player.skipAd();
                } catch(e) {}
              }

              // Fast-forward safely (avoid calling setter continuously to prevent decoder stalling)
              if (video.playbackRate !== 10.0 && video.readyState >= 1) {
                video.playbackRate = 10.0;
              }

              // Jump to near end of the ad video ONCE per ad (leave 0.2s margin to prevent decoder EOS freeze)
              if (!hasJumpedThisAd && video.readyState >= 2 && isFinite(video.duration) && video.duration > 0 && video.duration < 180) {
                hasJumpedThisAd = true;
                video.currentTime = Math.max(0, video.duration - 0.2);
              }

              // Play if paused without flood
              if (video.paused && video.readyState >= 2 && !isPlayingAd) {
                isPlayingAd = true;
                try {
                  var p = video.play();
                  if (p && typeof p.then === 'function') {
                    p.catch(function(){}).finally(function() { isPlayingAd = false; });
                  } else {
                    isPlayingAd = false;
                  }
                } catch(e) {
                  isPlayingAd = false;
                }
              }

              if (now - lastReportTime > 1500) {
                lastReportTime = now;
                if (window.__RN_EXTENSION_BRIDGE__) {
                  window.__RN_EXTENSION_BRIDGE__.send('youtube-adblocker', 'AD_BLOCKED', {
                    source: 'video_ad_skip'
                  });
                }
              }
            } else {
              // NOT AN AD
              if (wasAdActive) {
                // Ad ended: restore user settings instantly
                wasAdActive = false;
                hasJumpedThisAd = false;
                currentAdSrc = '';
                video.playbackRate = savedPlaybackRate || 1.0;
                video.muted = savedMuted || false;
                video.volume = savedVolume || 1;

                if (video.paused && !video.ended) {
                  try { video.play().catch(function(){}); } catch(e) {}
                }
                if (player) {
                  try {
                    if (typeof player.unMute === 'function') player.unMute();
                    if (typeof player.getVolume === 'function' && player.getVolume() === 0) {
                      player.setVolume(Math.round((savedVolume || 1) * 100));
                    }
                    if (typeof player.playVideo === 'function') player.playVideo();
                  } catch(e) {}
                }

                // Automatic MediaCodec hardware decoder flush & unfreeze kick:
                // Prevents black screen freeze after ad skip without needing manual scrub
                var unfreezeDecoder = function() {
                  try {
                    if (!video || video.ended) return;
                    if (video.currentTime < 1.0) {
                      video.currentTime = Math.max(0.01, (video.currentTime || 0) + 0.01);
                    }
                    if (video.paused) {
                      video.play().catch(function(){});
                    }
                    if (player && typeof player.playVideo === 'function') {
                      player.playVideo();
                    }
                  } catch(e) {}
                };
                setTimeout(unfreezeDecoder, 60);
                setTimeout(unfreezeDecoder, 200);
                setTimeout(unfreezeDecoder, 500);
              } else if (video.playbackRate >= 4.0) {
                // Safety recovery in case ad detection ended abruptly
                video.playbackRate = savedPlaybackRate || 1.0;
              }
            }
          }
        }

        // 1. Polling interval for fast ad skip response and dialog dismissal
        setInterval(runAdSkipper, 40);
        setInterval(dismissWarnings, 500);
        dismissWarnings();

        // 2. Focused MutationObserver on player container (or body if player not yet created)
        try {
          var observer = new MutationObserver(function() {
            runAdSkipper();
          });
          var targetElem = document.getElementById('movie_player') ||
                           document.getElementById('player') ||
                           document.querySelector('.html5-video-player') ||
                           document.documentElement;
          observer.observe(targetElem, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
          });
        } catch(e) {}

        // 3. Media events for instantaneous reaction
        var eventTypes = ['timeupdate', 'play', 'playing', 'loadstart', 'loadeddata'];
        for (var i = 0; i < eventTypes.length; i++) {
          document.addEventListener(eventTypes[i], function(e) {
            if (e.target && e.target.tagName === 'VIDEO') {
              runAdSkipper();
            }
          }, true);
        }

        // 4. Handle YouTube SPA navigation
        window.addEventListener('yt-navigate-finish', function() {
          wasAdActive = false;
          hasJumpedThisAd = false;
          currentAdSrc = '';
          runAdSkipper();
        });

        // 5. Anti-Freeze Watchdog: detects if main video is stalled on a black frame and auto-kicks the decoder
        var lastWatchedTime = -1;
        var freezeStallCount = 0;

        function unfreezeWatchdog() {
          var v = document.querySelector('video');
          if (!v || v.paused || v.ended || v.readyState < 2 || checkIsAd(v)) {
            freezeStallCount = 0;
            return;
          }

          if (v.currentTime === lastWatchedTime) {
            freezeStallCount++;
            if (freezeStallCount >= 6) {
              freezeStallCount = 0;
              try {
                // Micro-nudge forward flushes decoder buffer and immediately restores rendering
                v.currentTime = v.currentTime + 0.01;
                v.play().catch(function(){});
                var p = findPlayer(v);
                if (p && typeof p.playVideo === 'function') p.playVideo();
              } catch(e) {}
            }
          } else {
            lastWatchedTime = v.currentTime;
            freezeStallCount = 0;
          }
        }
        setInterval(unfreezeWatchdog, 500);
      })();
    `;
  },
};
