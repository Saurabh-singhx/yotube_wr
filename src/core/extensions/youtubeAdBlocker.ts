import { ExtensionManifest } from '../../types/extension';

export const youtubeAdBlocker: ExtensionManifest = {
  id: 'youtube-adblocker',
  name: 'AdShield Pro for YouTube',
  description: 'Instantly skips video ads, eliminates black screen stalls, and hides banner promotions.',
  version: '3.0.0',
  author: 'YouTube_wr Core Team',
  icon: 'shield-checkmark',
  category: 'adblock',
  enabled: true,
  urlMatches: ['*://*.youtube.com/*', '*://m.youtube.com/*'],
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
      ytm-item-section-renderer[section-identifier="comment-item-section"] + ytm-promoted-sparkles-web-renderer {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        max-height: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
  },

  // Document Start: Lightweight bridge preparation without breaking native fetch
  injectedJSStart: () => {
    return `
      (function() {
        // Ensure clean window state without monkey-patching native fetch
        // (tampering with fetch triggers YouTube's server-side anti-adblock black screen delay)
        window.__AD_SKIPPER_LOADED__ = true;
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
        var savedVolume = 1;
        var savedMuted = false;
        var savedPlaybackRate = 1.0;
        var lastReportTime = 0;

        function runAdSkipper() {
          var video = document.querySelector('video');
          var player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
          if (!video) return;

          // Detect ad state using reliable indicators
          var isAd = false;

          // 1. YouTube player class checks
          if (player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'))) {
            isAd = true;
          }

          // 2. Mobile web video player ad presence
          var adBadge = document.querySelector('.ytp-ad-badge, .ytp-ad-simple-ad-badge, .ytp-ad-duration-remaining');
          if (adBadge) {
            isAd = true;
          }

          // 3. Skip button availability
          var skipBtn = document.querySelector(
            '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button-slot button, button.ytp-ad-skip-button'
          );
          if (skipBtn) {
            isAd = true;
          }

          // 4. Overlay close button
          var overlayClose = document.querySelector('.ytp-ad-overlay-close-button');
          if (overlayClose) {
            try { overlayClose.click(); } catch(e) {}
          }

          if (isAd) {
            if (!wasAdActive) {
              wasAdActive = true;
              savedMuted = video.muted;
              savedVolume = video.volume;
              savedPlaybackRate = video.playbackRate && video.playbackRate <= 4 ? video.playbackRate : 1.0;
            }

            // Immediately mute ad audio
            if (${muteAd}) {
              video.muted = true;
            }

            // Click skip button immediately
            if (skipBtn) {
              try { skipBtn.click(); } catch(e) {}
            }

            // Call native player API if present
            if (player && typeof player.skipAd === 'function') {
              try { player.skipAd(); } catch(e) {}
            }

            // Fast-forward through the ad video at 16x speed
            video.playbackRate = 16.0;

            // If the video is paused (which happens during black screen stalls), force play!
            if (video.paused) {
              try { video.play().catch(function(){}); } catch(e) {}
            }

            // Jump close to the end to complete unskippable bumpers in 1 frame
            if (isFinite(video.duration) && video.duration > 0.5) {
              if (video.currentTime < video.duration - 0.2) {
                video.currentTime = video.duration - 0.1;
              }
            }

            var now = Date.now();
            if (now - lastReportTime > 1500) {
              lastReportTime = now;
              if (window.__RN_EXTENSION_BRIDGE__) {
                window.__RN_EXTENSION_BRIDGE__.send('youtube-adblocker', 'AD_BLOCKED', {
                  source: 'video_ad_skip'
                });
              }
            }
          } else if (wasAdActive) {
            // AD ENDED: Restore original user settings instantly!
            wasAdActive = false;
            video.playbackRate = savedPlaybackRate;
            video.muted = savedMuted;
            video.volume = savedVolume;
            if (video.paused) {
              try { video.play().catch(function(){}); } catch(e) {}
            }
          }

          // Auto-dismiss anti-adblock dialogs
          var dismissBtn = document.querySelector(
            'tp-yt-paper-dialog #dismiss-button, ytd-enforcement-message-view-model button, #feedback-undo'
          );
          if (dismissBtn) {
            try { dismissBtn.click(); } catch(e) {}
          }
        }

        // Fast polling interval (50ms) for instant ad skipping
        setInterval(runAdSkipper, 50);

        // Also trigger on video timeupdate and play events
        document.addEventListener('timeupdate', function(e) {
          if (e.target && e.target.tagName === 'VIDEO') {
            runAdSkipper();
          }
        }, true);

        document.addEventListener('play', function(e) {
          if (e.target && e.target.tagName === 'VIDEO') {
            runAdSkipper();
          }
        }, true);
      })();
    `;
  },
};
