/**
 * Media Session & Background Playback JavaScript Injection
 *
 * 1. Background Playback Spoofing:
 *    - Overrides Document Visibility API (hidden, visibilityState) so YouTube does not pause
 *      when the app is minimized, sent to background, or device screen is locked.
 *    - Intercepts addEventListener to drop visibilitychange and pagehide pause triggers.
 *
 * 2. MediaSession Bridge:
 *    - Intercepts navigator.mediaSession metadata, playbackState, and action handlers.
 *    - Continuously extracts video title, channel, artwork, and playback progress.
 *    - Relays media updates to the native Android MediaSession & Foreground Service.
 */

export function getBackgroundPlayScript(): string {
  return `
    (function() {
      try {
        // 1. Spoof Document and Document.prototype visibility properties
        var spoofProperties = {
          hidden: { get: function() { return false; }, configurable: true },
          visibilityState: { get: function() { return 'visible'; }, configurable: true },
          webkitHidden: { get: function() { return false; }, configurable: true },
          webkitVisibilityState: { get: function() { return 'visible'; }, configurable: true }
        };

        try {
          Object.defineProperties(Document.prototype, spoofProperties);
          Object.defineProperties(document, spoofProperties);
          if (window.HTMLDocument) {
            Object.defineProperties(window.HTMLDocument.prototype, spoofProperties);
          }
        } catch(e) {}

        // 2. Prevent onvisibilitychange / onpagehide / onblur handlers
        try {
          var nullProp = { get: function() { return null; }, set: function() {}, configurable: true };
          Object.defineProperty(document, 'onvisibilitychange', nullProp);
          Object.defineProperty(Document.prototype, 'onvisibilitychange', nullProp);
          Object.defineProperty(window, 'onpagehide', nullProp);
          Object.defineProperty(Window.prototype, 'onpagehide', nullProp);
          Object.defineProperty(window, 'onblur', nullProp);
          Object.defineProperty(Window.prototype, 'onblur', nullProp);
          Object.defineProperty(document, 'onblur', nullProp);
          Object.defineProperty(Document.prototype, 'onblur', nullProp);
        } catch(e) {}

        // 3. Capture-phase immediate propagation stopper for visibility, blur, focusout, and pagehide events
        var swallowEvent = function(e) {
          if (e) {
            try { e.stopImmediatePropagation(); } catch(_) {}
            try { e.stopPropagation(); } catch(_) {}
          }
        };
        try {
          window.addEventListener('visibilitychange', swallowEvent, true);
          window.addEventListener('webkitvisibilitychange', swallowEvent, true);
          window.addEventListener('pagehide', swallowEvent, true);
          window.addEventListener('blur', swallowEvent, true);
          window.addEventListener('focusout', swallowEvent, true);
          document.addEventListener('visibilitychange', swallowEvent, true);
          document.addEventListener('webkitvisibilitychange', swallowEvent, true);
          document.addEventListener('blur', swallowEvent, true);
          document.addEventListener('focusout', swallowEvent, true);
        } catch(e) {}

        // 4. Drop visibilitychange, webkitvisibilitychange, pagehide & blur listeners at the EventTarget level
        try {
          var origEventTargetAddEventListener = EventTarget.prototype.addEventListener;
          EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (
              type === 'visibilitychange' ||
              type === 'webkitvisibilitychange' ||
              type === 'pagehide' ||
              type === 'blur' ||
              type === 'focusout'
            ) {
              return;
            }
            return origEventTargetAddEventListener.call(this, type, listener, options);
          };
        } catch(e) {}

        // 5. Overwrite hasFocus to always return true
        try {
          Document.prototype.hasFocus = function() { return true; };
          document.hasFocus = function() { return true; };
        } catch(e) {}

        // 6. User gesture & App state tracking to differentiate intentional pauses from automated background pauses
        window.__lastUserGestureTime = 0;
        window.__lastPlayerInteractionTime = 0;
        window.__userWantsPaused = false;
        window.__isRemotePauseCommand = false;
        window.__isRemotePlayCommand = false;
        if (typeof window.__isAppInBackground === 'undefined') {
          window.__isAppInBackground = false;
        }

        var recordUserGesture = function(ev) {
          if (ev && ev.isTrusted === false) return;
          var now = Date.now();
          window.__lastUserGestureTime = now;

          // Detect if touch/click was directed specifically at the video player or play/pause button
          try {
            var target = ev && ev.target;
            if (target && target.closest) {
              var isPlayerEl = target.closest(
                'video, .html5-video-player, #movie_player, .ytp-play-button, ytm-play-pause-button, ' +
                'button[aria-label*="pause" i], button[aria-label*="play" i], .ytp-chrome-bottom, .video-stream'
              );
              if (isPlayerEl) {
                window.__lastPlayerInteractionTime = now;
              }
            }
          } catch(_) {}
        };
        ['touchstart', 'touchend', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'keydown'].forEach(function(ev) {
          window.addEventListener(ev, recordUserGesture, true);
          document.addEventListener(ev, recordUserGesture, true);
        });

        // 7. Intercept HTMLMediaElement.prototype.pause and play
        try {
          var origMediaPlay = HTMLMediaElement.prototype.play;
          HTMLMediaElement.prototype.play = function() {
            var now = Date.now();
            var isPlayerTap = (now - (window.__lastPlayerInteractionTime || 0)) < 1500;
            // Only clear userWantsPaused if triggered by remote play command, explicit player tap, or not in paused state
            if (window.__isRemotePlayCommand || isPlayerTap || !window.__userWantsPaused) {
              window.__userWantsPaused = false;
              window.__isRemotePlayCommand = false;
            }
            return origMediaPlay.apply(this, arguments);
          };

          var origMediaPause = HTMLMediaElement.prototype.pause;
          HTMLMediaElement.prototype.pause = function() {
            var isRemotePause = window.__isRemotePauseCommand === true;
            if (isRemotePause) {
              window.__userWantsPaused = true;
              window.__isRemotePauseCommand = false;
              return origMediaPause.apply(this, arguments);
            }

            if (this.ended) {
              return origMediaPause.apply(this, arguments);
            }

            // If the app is in the background (minimized, screen locked, app switched),
            // NEVER allow automated background pauses from YouTube, blur, visibility loss, or Chromium!
            // This completely prevents background playback from pausing on app minimize or looping.
            if (window.__isAppInBackground === true) {
              return;
            }

            var now = Date.now();
            var isPlayerInteraction = (now - (window.__lastPlayerInteractionTime || 0)) < 1500;
            var isRecentGesture = (now - (window.__lastUserGestureTime || 0)) < 1200;

            // If the user already flagged they wanted playback paused in the foreground, allow it:
            if (window.__userWantsPaused) {
              return origMediaPause.apply(this, arguments);
            }

            // In foreground, if neither direct player interaction nor gesture occurred,
            // this is an automated pause triggered by background blur or visibility change.
            // Suppress it!
            if (!isPlayerInteraction && !isRecentGesture) {
              return;
            }

            // Legitimate user pause in foreground:
            window.__userWantsPaused = true;
            return origMediaPause.apply(this, arguments);
          };
        } catch(e) {}

        // 8. Setup navigator.mediaSession interception
        window.__ytwrMediaActions = {};
        if (!window.navigator.mediaSession) {
          window.navigator.mediaSession = {};
        }

        var _metadata = null;
        var _playbackState = 'none';

        try {
          Object.defineProperty(window.navigator.mediaSession, 'metadata', {
            get: function() { return _metadata; },
            set: function(val) {
              _metadata = val;
              try {
                if (val && window.__RN_EXTENSION_BRIDGE__) {
                  var artworkUrl = '';
                  if (val.artwork && val.artwork.length > 0) {
                    var lastArt = val.artwork[val.artwork.length - 1];
                    artworkUrl = (lastArt && lastArt.src) ? lastArt.src : '';
                  }
                  window.__RN_EXTENSION_BRIDGE__.send('media-session', 'METADATA_UPDATE', {
                    title: val.title || '',
                    artist: val.artist || '',
                    album: val.album || 'YouTube',
                    thumbnailUrl: artworkUrl
                  });
                }
              } catch(e) {}
            },
            configurable: true
          });
        } catch(e) {}

        try {
          Object.defineProperty(window.navigator.mediaSession, 'playbackState', {
            get: function() { return _playbackState; },
            set: function(val) {
              _playbackState = val;
              try {
                if (window.__RN_EXTENSION_BRIDGE__) {
                  window.__RN_EXTENSION_BRIDGE__.send('media-session', 'PLAYBACK_STATE_UPDATE', {
                    isPlaying: val === 'playing'
                  });
                }
              } catch(e) {}
            },
            configurable: true
          });
        } catch(e) {}

        var origSetActionHandler = window.navigator.mediaSession.setActionHandler;
        window.navigator.mediaSession.setActionHandler = function(action, handler) {
          window.__ytwrMediaActions[action] = handler;
          if (typeof origSetActionHandler === 'function') {
            try {
              origSetActionHandler.call(window.navigator.mediaSession, action, handler);
            } catch(e) {}
          }
        };

        var origSetPositionState = window.navigator.mediaSession.setPositionState;
        window.navigator.mediaSession.setPositionState = function(state) {
          try {
            if (state && window.__RN_EXTENSION_BRIDGE__) {
              window.__RN_EXTENSION_BRIDGE__.send('media-session', 'POSITION_UPDATE', {
                duration: state.duration || 0,
                position: state.position || 0,
                speed: state.playbackRate || 1
              });
            }
          } catch(e) {}
          if (typeof origSetPositionState === 'function') {
            try {
              origSetPositionState.call(window.navigator.mediaSession, state);
            } catch(e) {}
          }
        };
      } catch(e) {
        console.error('[Background Play Script Error]', e);
      }
    })();
  `;
}

export function getMediaObserverScript(): string {
  return `
    (function() {
      var lastSentIsPlaying = null;
      var lastSentTime = 0;

      function extractMetadata(video) {
        var title = '';
        var artist = '';
        var thumbnailUrl = '';

        // Title detection
        var titleSelectors = [
          '.slim-video-metadata-title',
          'h1.title',
          '.watch-title',
          'ytm-slim-video-information-renderer-header'
        ];
        for (var i = 0; i < titleSelectors.length; i++) {
          var el = document.querySelector(titleSelectors[i]);
          if (el && el.textContent && el.textContent.trim().length > 0) {
            title = el.textContent.trim();
            break;
          }
        }
        if (!title && document.title) {
          title = document.title.replace(' - YouTube', '').trim();
        }

        // Channel/Artist detection
        var artistSelectors = [
          '.slim-owner-channel-name',
          '.ytm-channel-title',
          '#channel-name',
          '.owner-name'
        ];
        for (var j = 0; j < artistSelectors.length; j++) {
          var aEl = document.querySelector(artistSelectors[j]);
          if (aEl && aEl.textContent && aEl.textContent.trim().length > 0) {
            artist = aEl.textContent.trim();
            break;
          }
        }

        // Thumbnail from video ID
        try {
          var match = window.location.href.match(/[?&]v=([^&#]+)/);
          if (match && match[1]) {
            thumbnailUrl = 'https://i.ytimg.com/vi/' + match[1] + '/hqdefault.jpg';
          }
        } catch(e) {}

        return {
          title: title,
          artist: artist,
          album: 'YouTube',
          thumbnailUrl: thumbnailUrl,
          isPlaying: !video.paused && !video.ended,
          position: video.currentTime || 0,
          duration: isFinite(video.duration) ? video.duration : 0,
          speed: video.playbackRate || 1
        };
      }

      function reportMediaState(video, force) {
        if (!video || !window.__RN_EXTENSION_BRIDGE__) return;
        var now = Date.now();
        var isPlaying = !video.paused && !video.ended;

        if (!force && lastSentIsPlaying === isPlaying && (now - lastSentTime < 2500)) {
          return;
        }

        lastSentTime = now;
        lastSentIsPlaying = isPlaying;

        var meta = extractMetadata(video);
        window.__RN_EXTENSION_BRIDGE__.send('media-session', 'MEDIA_STATE_UPDATE', meta);
      }

      function unmuteAudio(video) {
        if (!video) return;
        try {
          var player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
          var isAd = false;
          if (player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'))) {
            isAd = true;
          }
          if (document.querySelector('.video-ads.ytp-ad-module .ytp-ad-player-overlay, .ytp-ad-skip-button, .ytp-ad-skip-button-modern')) {
            isAd = true;
          }
          if (isAd) return;

          if (video.muted) {
            video.muted = false;
          }
          if (typeof video.volume === 'number' && video.volume === 0) {
            video.volume = 1.0;
          }
          if (player) {
            if (typeof player.isMuted === 'function' && player.isMuted()) {
              if (typeof player.unMute === 'function') player.unMute();
            }
            if (typeof player.getVolume === 'function' && player.getVolume() === 0) {
              if (typeof player.setVolume === 'function') player.setVolume(100);
            }
          }
          var unmuteBtn = document.querySelector(
            '.ytp-unmute, .ytp-unmute-inner, button[aria-label*="unmute" i], .volume-icon-muted, ytm-unmute-button'
          );
          if (unmuteBtn) {
            try { unmuteBtn.click(); } catch(e) {}
          }
        } catch(e) {}
      }

      function attachToVideo(video) {
        if (!video || video.__ytwrAttached) return;
        video.__ytwrAttached = true;

        var events = ['play', 'playing', 'pause', 'ended', 'timeupdate', 'loadedmetadata', 'ratechange'];
        events.forEach(function(ev) {
          video.addEventListener(ev, function() {
            if (ev === 'play' || ev === 'playing') {
              window.__userWantsPaused = false;
              unmuteAudio(video);
            } else if (ev === 'timeupdate' && !video.paused) {
              window.__userWantsPaused = false;
            }
            reportMediaState(video, ev !== 'timeupdate');
          });
        });

        if (!video.paused) {
          unmuteAudio(video);
          reportMediaState(video, true);
        }
      }

      // Initial check
      document.querySelectorAll('video').forEach(attachToVideo);

      // Mutation observer for dynamic video element changes
      try {
        var observer = new MutationObserver(function() {
          document.querySelectorAll('video').forEach(function(v) {
            attachToVideo(v);
          });
        });
        observer.observe(document.body || document.documentElement, {
          childList: true,
          subtree: true
        });
      } catch(e) {}

      // YouTube SPA navigation listener
      window.addEventListener('yt-navigate-finish', function() {
        window.__userWantsPaused = false;
        setTimeout(function() {
          var v = document.querySelector('video');
          if (v) {
            attachToVideo(v);
            unmuteAudio(v);
            reportMediaState(v, true);
          } else {
            if (window.__RN_EXTENSION_BRIDGE__) {
              window.__RN_EXTENSION_BRIDGE__.send('media-session', 'MEDIA_STATE_UPDATE', {
                isPlaying: false
              });
            }
          }
        }, 600);
      });

      // Background playback keepalive watchdog: resumes playback if paused without user intention
      setInterval(function() {
        if (window.__userWantsPaused) return;
        var videos = document.querySelectorAll('video');
        for (var i = 0; i < videos.length; i++) {
          var v = videos[i];
          if (v.paused && !v.ended && v.readyState >= 2 && !window.__userWantsPaused) {
            unmuteAudio(v);
            v.play().catch(function() {});
          }
        }
      }, 1000);
    })();
  `;
}

export function getRemoteControlScript(action: string, position?: number): string {
  const safePosition = typeof position === 'number' && !isNaN(position) ? position : 0;
  return `
    (function() {
      try {
        var video = document.querySelector('video');
        var actions = window.__ytwrMediaActions || {};

        switch ('${action}') {
          case 'PLAY':
            window.__userWantsPaused = false;
            window.__isRemotePlayCommand = true;
            if (video) {
              try {
                if (video.muted) video.muted = false;
                if (typeof video.volume === 'number' && video.volume === 0) video.volume = 1.0;
                var p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
                if (p && typeof p.isMuted === 'function' && p.isMuted()) p.unMute();
                if (p && typeof p.getVolume === 'function' && p.getVolume() === 0) p.setVolume(100);
              } catch(e) {}
            }
            if (typeof actions['play'] === 'function') {
              try { actions['play'](); } catch(e) {}
            } else if (video) {
              video.play().catch(function(){});
            }
            break;
          case 'PAUSE':
            window.__userWantsPaused = true;
            window.__isRemotePauseCommand = true;
            if (typeof actions['pause'] === 'function') {
              try { actions['pause'](); } catch(e) {}
            } else if (video) {
              video.pause();
            }
            break;
          case 'FAST_FORWARD':
            if (typeof actions['seekforward'] === 'function') {
              try { actions['seekforward']({ seekOffset: 10 }); } catch(e) {}
            } else if (video) {
              video.currentTime = Math.min(video.duration || 0, (video.currentTime || 0) + 10);
            }
            break;
          case 'REWIND':
            if (typeof actions['seekbackward'] === 'function') {
              try { actions['seekbackward']({ seekOffset: 10 }); } catch(e) {}
            } else if (video) {
              video.currentTime = Math.max(0, (video.currentTime || 0) - 10);
            }
            break;
          case 'SEEK_TO':
            if (typeof actions['seekto'] === 'function') {
              try { actions['seekto']({ seekTime: ${safePosition} }); } catch(e) {}
            } else if (video) {
              video.currentTime = ${safePosition};
            }
            break;
          case 'SKIP_NEXT':
            if (typeof actions['nexttrack'] === 'function') {
              try { actions['nexttrack'](); } catch(e) {}
            } else {
              var nextBtn = document.querySelector('.ytp-next-button, button[aria-label*="Next" i], .item-thumbnail-next');
              if (nextBtn) {
                nextBtn.click();
              }
            }
            break;
          case 'SKIP_PREV':
            if (typeof actions['previoustrack'] === 'function') {
              try { actions['previoustrack'](); } catch(e) {}
            } else if (video && video.currentTime > 3) {
              video.currentTime = 0;
            } else {
              window.history.back();
            }
            break;
          case 'STOP':
            window.__userWantsPaused = true;
            window.__isRemotePauseCommand = true;
            if (video) video.pause();
            break;
        }
      } catch(e) {
        console.error('[Remote Control Error]', e);
      }
    })();
    true;
  `;
}
