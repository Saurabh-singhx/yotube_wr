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
  // CAUTION: Never hide .video-ads, #movie_player, or .html5-video-player itself!
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
      /* YouTube Player Ad Overlays (Eliminates skip buttons, countdown timers, and ad badges from visually flashing) */
      .ytp-ad-player-overlay,
      .ytp-ad-player-overlay-layout,
      .ytp-ad-player-overlay-skip-or-preview,
      .ytp-ad-skip-button-slot,
      .ytp-ad-skip-button-container,
      .ytp-ad-skip-button,
      .ytp-ad-skip-button-modern,
      .ytp-skip-ad-button,
      .ytp-ad-duration-remaining,
      .ytp-ad-badge,
      .ytp-ad-badge-modern,
      .ytp-ad-text,
      .ytp-ad-preview-container,
      .ytp-ad-preview-text,
      .ytm-ad-skip-button,
      .ytm-ad-preview-renderer,
      .ytp-ad-action-interstitial,
      .ytp-ad-image-overlay,
      .ytp-ad-overlay-container,
      [class*="ytp-ad-skip-button"],
      [class*="ytp-ad-preview"],
      [class*="ytp-ad-overlay"],
      /* YouTube Mobile "Open App" / App Banner Popups, Mealbars & Duplicate Bottom Pivot Bar */
      ytm-pivot-bar-renderer,
      .pivot-bar,
      ytm-open-app-button-renderer,
      .ytm-open-app-button-renderer,
      ytm-mealbar-promo-renderer,
      yt-mealbar-promo-renderer,
      ytm-consent-bump-v2-renderer,
      ytd-consent-bump-v2-lightbox,
      #consent-bump,
      .consent-bump,
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
  // Uses property deletion / undefined (never sets empty array [] which crashes YouTube player validation)
  injectedJSStart: () => {
    return `
      (function() {
        if (window.__AD_INTERCEPT_LOADED__) return;
        window.__AD_INTERCEPT_LOADED__ = true;

        function pruneAdData(data) {
          if (!data || typeof data !== 'object') return data;
          try {
            // 1. Root-level ad schedule properties
            // IMPORTANT: Delete the property completely so YouTube player treats the stream as unmonetized/premium.
            // NEVER set to [] (empty array) - doing so causes player schema validation failure and auto-pause!
            if ('adPlacements' in data) delete data.adPlacements;
            if ('playerAds' in data) delete data.playerAds;
            if ('adSlots' in data) delete data.adSlots;
            if ('adBreakHeartbeatParams' in data) delete data.adBreakHeartbeatParams;

            // 2. Nested playerResponse structures (common in initial responses and SPA payloads)
            if (data.playerResponse && typeof data.playerResponse === 'object') {
              pruneAdData(data.playerResponse);
            }
          } catch(e) {}
          return data;
        }

        // 1. Intercept window.ytInitialPlayerResponse
        try {
          var _initialResp = window.ytInitialPlayerResponse;
          if (_initialResp) {
            pruneAdData(_initialResp);
          }
          Object.defineProperty(window, 'ytInitialPlayerResponse', {
            get: function() { return _initialResp; },
            set: function(val) { _initialResp = pruneAdData(val); },
            configurable: true,
            enumerable: true
          });
        } catch(e) {}

        // 2. Intercept Response.prototype.json (safely modifies deserialized JSON without breaking network streams or gzip/brotli decoding)
        try {
          if (typeof Response !== 'undefined' && Response.prototype && Response.prototype.json) {
            var origJson = Response.prototype.json;
            Response.prototype.json = function() {
              return origJson.apply(this, arguments).then(function(result) {
                if (result && typeof result === 'object') {
                  if (result.adPlacements || result.playerAds || result.adSlots ||
                      (result.playerResponse && (result.playerResponse.adPlacements || result.playerResponse.adSlots))) {
                    pruneAdData(result);
                    if (window.__RN_EXTENSION_BRIDGE__) {
                      window.__RN_EXTENSION_BRIDGE__.send('youtube-adblocker', 'AD_BLOCKED', { source: 'data_prune' });
                    }
                  }
                }
                return result;
              });
            };
          }
        } catch(e) {}

        // 3. Intercept JSON.parse for YouTube player configs
        try {
          var origJSONParse = JSON.parse;
          JSON.parse = function(text, reviver) {
            var res = origJSONParse.apply(this, arguments);
            if (res && typeof res === 'object') {
              if (res.adPlacements || res.playerAds || res.adSlots ||
                  (res.playerResponse && (res.playerResponse.adPlacements || res.playerResponse.adSlots))) {
                pruneAdData(res);
                if (window.__RN_EXTENSION_BRIDGE__) {
                  window.__RN_EXTENSION_BRIDGE__.send('youtube-adblocker', 'AD_BLOCKED', { source: 'json_prune' });
                }
              }
            }
            return res;
          };
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
        var adExitDebounceTimer = null;

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

          if (player) {
            // 1. Native player API check: definitive authority when available
            try {
              if (typeof player.isAdShowing === 'function') {
                var isShowing = player.isAdShowing();
                if (!isShowing) return false;
                return true;
              }
              if (typeof player.getAdState === 'function') {
                var adState = player.getAdState();
                if (adState === 0) return false;
                if (adState > 0) return true;
              }
            } catch(e) {}

            // 2. Visible ad overlays strictly inside player
            var adOverlay = player.querySelector('.ytp-ad-player-overlay, .ytp-ad-badge, .ytp-ad-duration-remaining');
            if (adOverlay && isVisible(adOverlay)) {
              return true;
            }

            // 3. Player container class indicators (fallback for initial DOM mount)
            var cls = player.className || '';
            if (cls.indexOf('ad-showing') !== -1 || cls.indexOf('ad-interrupting') !== -1) {
              return true;
            }
          }

          // 4. Video src query parameter indicators (distinct ad streams)
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
              if (btn) {
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
              'ytm-mealbar-promo-renderer button, ytm-upsell-dialog-renderer button, ' +
              'button[aria-label*="Not now" i], button[aria-label*="Agree" i], button[aria-label*="Accept" i], ' +
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
              // Cancel any pending exit transition debounce immediately
              if (adExitDebounceTimer) {
                clearTimeout(adExitDebounceTimer);
                adExitDebounceTimer = null;
              }

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

              // Mute ad audio instantly
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

              // Fast-forward at max safe rate (16x)
              if (video.playbackRate !== 16.0 && video.readyState >= 1) {
                video.playbackRate = 16.0;
              }

              // Jump to end of ad video immediately without waiting for readyState >= 2
              // (eliminates 1-3s mobile buffering delay where ad was forced to play)
              if (!hasJumpedThisAd && isFinite(video.duration) && video.duration > 0 && video.duration <= 180) {
                hasJumpedThisAd = true;
                video.currentTime = Math.max(0, video.duration - 0.1);
              }

              // Play if paused without flood
              if (video.paused && !isPlayingAd && !window.__userWantsPaused) {
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
                // Debounce ad exit (150ms) to prevent violent flickering between back-to-back ads (Ad 1 of 2 -> Ad 2 of 2)
                if (!adExitDebounceTimer) {
                  adExitDebounceTimer = setTimeout(function() {
                    adExitDebounceTimer = null;
                    var activeVideo = document.querySelector('video');
                    var activePlayer = findPlayer(activeVideo);
                    if (checkIsAd(activeVideo, activePlayer)) {
                      return;
                    }

                    wasAdActive = false;
                    hasJumpedThisAd = false;
                    currentAdSrc = '';

                    if (activeVideo) {
                      activeVideo.playbackRate = savedPlaybackRate || 1.0;
                      activeVideo.muted = savedMuted || false;
                      activeVideo.volume = savedVolume || 1;

                      // Anti-black screen guard: if the main video was mistakenly jumped past beginning, reset currentTime
                      if (activeVideo.duration > 120 && activeVideo.currentTime > activeVideo.duration - 5) {
                        activeVideo.currentTime = 0;
                      }

                      if (activeVideo.paused && !activeVideo.ended && !window.__userWantsPaused) {
                        try { activeVideo.play().catch(function(){}); } catch(e) {}
                      }
                    }

                    if (activePlayer && !window.__userWantsPaused) {
                      try {
                        if (typeof activePlayer.unMute === 'function') activePlayer.unMute();
                        if (typeof activePlayer.getVolume === 'function' && activePlayer.getVolume() === 0) {
                          activePlayer.setVolume(Math.round((savedVolume || 1) * 100));
                        }
                        if (typeof activePlayer.playVideo === 'function') activePlayer.playVideo();
                      } catch(e) {}
                    }
                  }, 150);
                }
              } else if (video.playbackRate >= 4.0) {
                // Safety recovery in case ad detection ended abruptly
                video.playbackRate = savedPlaybackRate || 1.0;
              }
            }
          }
        }

        // 1. Polling interval for fast ad skip response and dialog dismissal
        setInterval(runAdSkipper, 35);
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
          if (adExitDebounceTimer) {
            clearTimeout(adExitDebounceTimer);
            adExitDebounceTimer = null;
          }
          wasAdActive = false;
          hasJumpedThisAd = false;
          currentAdSrc = '';
          runAdSkipper();
        });

        // 5. Anti-Freeze Watchdog: detects if main video is stalled on a black frame and auto-kicks the decoder
        var lastWatchedTime = -1;
        var freezeStallCount = 0;

        function unfreezeWatchdog() {
          // In background: NEVER force playback, nudge timers, or kick players
          if (window.__isAppInBackground === true) {
            freezeStallCount = 0;
            return;
          }

          var v = document.querySelector('#movie_player video, .html5-video-player video, #player video, video.video-stream');
          if (!v) v = document.querySelector('video');
          if (!v || checkIsAd(v) || window.__userWantsPaused) {
            freezeStallCount = 0;
            return;
          }
          if (v.closest && v.closest('.inline-preview, ytd-video-preview, ytm-video-preview, ytm-media-item, ytm-playlist-media-item, ytd-rich-item-renderer')) {
            freezeStallCount = 0;
            return;
          }

          // Case A: Main video was left in a paused/interrupted state specifically during/right after an ad transition
          if (wasAdActive && v.paused && !v.ended && v.readyState >= 1) {
            freezeStallCount++;
            if (freezeStallCount >= 3) { // ~900ms of unexpected pause
              freezeStallCount = 0;
              try {
                v.play().catch(function(){});
                var p = findPlayer(v);
                if (p && typeof p.playVideo === 'function') p.playVideo();
              } catch(e) {}
            }
            return;
          }

          // Case B: Video is playing but frame timeline is stuck on a single frame (MediaCodec hardware stall)
          if (!v.paused && !v.ended && v.readyState >= 2) {
            if (v.currentTime === lastWatchedTime) {
              freezeStallCount++;
              if (freezeStallCount >= 4) { // ~1.2s of frozen frame
                freezeStallCount = 0;
                try {
                  // Micro-nudge forward flushes decoder buffer and immediately restores rendering
                  v.currentTime = v.currentTime + 0.01;
                  v.play().catch(function(){});
                  var p2 = findPlayer(v);
                  if (p2 && typeof p2.playVideo === 'function') p2.playVideo();
                } catch(e) {}
              }
            } else {
              lastWatchedTime = v.currentTime;
              freezeStallCount = 0;
            }
          }
        }
        setInterval(unfreezeWatchdog, 300);
      })();
    `;
  },
};
