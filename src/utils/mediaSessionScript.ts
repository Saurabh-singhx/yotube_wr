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

        // 2. Prevent onvisibilitychange / onpagehide / onblur / onfreeze / onfocusout handlers
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
          Object.defineProperty(window, 'onfreeze', nullProp);
          Object.defineProperty(Window.prototype, 'onfreeze', nullProp);
          Object.defineProperty(document, 'onfreeze', nullProp);
          Object.defineProperty(Document.prototype, 'onfreeze', nullProp);
          Object.defineProperty(window, 'onfocusout', nullProp);
          Object.defineProperty(Window.prototype, 'onfocusout', nullProp);
          Object.defineProperty(document, 'onfocusout', nullProp);
          Object.defineProperty(Document.prototype, 'onfocusout', nullProp);
        } catch(e) {}

        // 3. Capture-phase blur & visibility tracking and immediate propagation stopper
        window.__windowHasBlur = false;
        window.__lastBlurTime = 0;

        var onCaptureBlur = function(e) {
          window.__windowHasBlur = true;
          window.__lastBlurTime = Date.now();
          if (e) {
            try { e.stopImmediatePropagation(); } catch(_) {}
            try { e.stopPropagation(); } catch(_) {}
          }
        };

        var onCaptureFocus = function() {
          window.__windowHasBlur = false;
          window.__lastBlurTime = 0;
        };

        var swallowEvent = function(e) {
          if (e) {
            try { e.stopImmediatePropagation(); } catch(_) {}
            try { e.stopPropagation(); } catch(_) {}
          }
        };

        try {
          window.addEventListener('blur', onCaptureBlur, true);
          window.addEventListener('focusout', onCaptureBlur, true);
          document.addEventListener('blur', onCaptureBlur, true);
          document.addEventListener('focusout', onCaptureBlur, true);
          window.addEventListener('focus', onCaptureFocus, true);
          document.addEventListener('focus', onCaptureFocus, true);
          window.addEventListener('visibilitychange', swallowEvent, true);
          window.addEventListener('webkitvisibilitychange', swallowEvent, true);
          window.addEventListener('pagehide', swallowEvent, true);
          window.addEventListener('freeze', swallowEvent, true);
          document.addEventListener('visibilitychange', swallowEvent, true);
          document.addEventListener('webkitvisibilitychange', swallowEvent, true);
          document.addEventListener('freeze', swallowEvent, true);
        } catch(e) {}

        // 4. Drop visibilitychange, webkitvisibilitychange, pagehide, blur, focusout & freeze listeners
        try {
          var dropEvents = ['visibilitychange', 'webkitvisibilitychange', 'pagehide', 'blur', 'focusout', 'freeze', 'resume'];
          var shouldDrop = function(type) {
            return dropEvents.indexOf(type) !== -1;
          };

          var patchAddEventListener = function(target) {
            if (!target || !target.addEventListener) return;
            var orig = target.addEventListener;
            target.addEventListener = function(type, listener, options) {
              if (shouldDrop(type)) return;
              return orig.call(this, type, listener, options);
            };
          };

          if (window.EventTarget && window.EventTarget.prototype) {
            patchAddEventListener(window.EventTarget.prototype);
          }
          if (window.Window && window.Window.prototype) {
            patchAddEventListener(window.Window.prototype);
          }
          if (window.Document && window.Document.prototype) {
            patchAddEventListener(window.Document.prototype);
          }
          patchAddEventListener(window);
          patchAddEventListener(document);
        } catch(e) {}

        // 5. Overwrite hasFocus to always return true
        try {
          Document.prototype.hasFocus = function() { return true; };
          document.hasFocus = function() { return true; };
        } catch(e) {}

        // 5.1. Proxy IntersectionObserver to shield main player from offscreen/minimized auto-pause
        try {
          var OrigIntersectionObserver = window.IntersectionObserver;
          if (OrigIntersectionObserver) {
            window.IntersectionObserver = function(callback, options) {
              var proxiedCallback = function(entries, observer) {
                var safeEntries = entries.map(function(entry) {
                  var isPlayerTarget = false;
                  try {
                    if (entry.target) {
                      var t = entry.target;
                      if (t.tagName === 'VIDEO' ||
                          (t.closest && t.closest('#movie_player, .html5-video-player, #player, .player-container, #player-container-id, .video-player, ytm-custom-control, ytm-mobile-player-overlay-renderer, #player-control-overlay, .player-controls-background, ytm-watch'))) {
                        isPlayerTarget = true;
                      }
                    }
                  } catch(_) {}

                  if (isPlayerTarget) {
                    try {
                      return new Proxy(entry, {
                        get: function(target, prop) {
                          if (prop === 'isIntersecting') return true;
                          if (prop === 'intersectionRatio') return 1.0;
                          var val = target[prop];
                          return typeof val === 'function' ? val.bind(target) : val;
                        }
                      });
                    } catch(_) {
                      return entry;
                    }
                  }
                  return entry;
                });
                return callback(safeEntries, observer);
              };
              return new OrigIntersectionObserver(proxiedCallback, options);
            };
            window.IntersectionObserver.prototype = OrigIntersectionObserver.prototype;
          }
        } catch(e) {}

        // 6. User gesture & App state tracking to differentiate intentional pauses from automated background pauses
        window.__lastUserGestureTime = 0;
        window.__lastPlayerInteractionTime = 0;
        window.__lastPauseButtonTapTime = 0;
        window.__userWantsPaused = false;
        window.__isRemotePauseCommand = false;
        window.__isRemotePlayCommand = false;
        if (typeof window.__isAppInBackground === 'undefined') {
          window.__isAppInBackground = false;
        }

        var isPauseButtonElement = function(target) {
          if (!target) return false;
          try {
            var btn = target.closest && target.closest(
              '.ytp-play-button, ytm-play-pause-button, button[aria-label*="pause" i], ' +
              '.player-control-pause, [data-action="pause"], ytm-custom-control, ' +
              '.ytp-mobile-play-button, button.icon-button[aria-label*="pause" i], ' +
              'button[title*="pause" i], [aria-label="Pause"]'
            );
            if (!btn) return false;

            var label = ((btn.getAttribute && btn.getAttribute('aria-label')) ||
                         (btn.getAttribute && btn.getAttribute('title')) ||
                         btn.className || '').toLowerCase();
            if (label.indexOf('pause') !== -1) return true;

            // If it's a play/pause toggle button on the active video while video is currently playing:
            if (btn.classList && (btn.classList.contains('ytp-play-button') || btn.tagName === 'YTM-PLAY-PAUSE-BUTTON')) {
              var v = document.querySelector('video');
              if (v && !v.paused) return true;
            }
          } catch(_) {}
          return false;
        };

        var recordUserGesture = function(ev) {
          // Ignore untrusted/synthetic script-generated events in real browser environments
          var isJSDOM = typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.indexOf('jsdom') !== -1;
          if (!isJSDOM && ev && ev.isTrusted === false) {
            return;
          }

          // Extract clientY across PointerEvent, MouseEvent, TouchEvent (touchstart, touchmove, touchend)
          var clientY = -1;
          if (ev) {
            if (typeof ev.clientY === 'number') {
              clientY = ev.clientY;
            } else if (ev.touches && ev.touches[0] && typeof ev.touches[0].clientY === 'number') {
              clientY = ev.touches[0].clientY;
            } else if (ev.changedTouches && ev.changedTouches[0] && typeof ev.changedTouches[0].clientY === 'number') {
              clientY = ev.changedTouches[0].clientY;
            }
          }

          // Ignore system gesture navigation touches at the bottom of the screen (bottom 95px)
          if (clientY >= 0 && clientY >= (window.innerHeight - 95)) {
            return;
          }

          var now = Date.now();
          window.__lastUserGestureTime = now;

          // Check if the user specifically touched/clicked an explicit PAUSE control button
          try {
            var target = ev && ev.target;
            if (target && isPauseButtonElement(target)) {
              window.__lastPauseButtonTapTime = now;
              window.__lastPlayerInteractionTime = now;
            }
          } catch(_) {}

          if (ev && ev.type === 'keydown') {
            var key = ev.code || ev.key;
            if (key === 'Space' || key === ' ' || key === 'KeyK' || key === 'k' || key === 'MediaPlayPause') {
              window.__lastPauseButtonTapTime = now;
              window.__lastPlayerInteractionTime = now;
            }
          }
        };
        ['touchstart', 'touchend', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'keydown'].forEach(function(ev) {
          window.addEventListener(ev, recordUserGesture, true);
          document.addEventListener(ev, recordUserGesture, true);
        });

        // 7. Intercept HTMLMediaElement.prototype.pause and play
        try {
          var origMediaPlay = HTMLMediaElement.prototype.play;
          HTMLMediaElement.prototype.play = function() {
            window.__userWantsPaused = false;
            window.__isRemotePlayCommand = false;
            return origMediaPlay.apply(this, arguments);
          };

          var origMediaPause = HTMLMediaElement.prototype.pause;
          HTMLMediaElement.prototype.pause = function() {
            // 1. If triggered by an explicit remote pause command (notification / lockscreen / headset), allow pause
            var isRemotePause = window.__isRemotePauseCommand === true;
            if (isRemotePause) {
              window.__userWantsPaused = true;
              window.__isRemotePauseCommand = false;
              return origMediaPause.apply(this, arguments);
            }

            // 2. Video naturally ended: allow pause
            if (this.ended) {
              return origMediaPause.apply(this, arguments);
            }

            // 3. Thumbnail preview videos (feed previews, playlist previews) must pause freely
            var isPreviewEl = !!(this.closest && this.closest(
              '.inline-preview, ytd-video-preview, ytm-video-preview, ytm-media-item, ' +
              'ytm-playlist-media-item, ytd-rich-item-renderer, ytd-compact-video-renderer, ' +
              '.video-preview, .feed-item-preview'
            ));
            if (isPreviewEl) {
              return origMediaPause.apply(this, arguments);
            }

            // 4. In background OR window blurred/blur-transition: Suppress all automated pauses from YouTube/Chromium!
            var now = Date.now();
            var isBlurRecent = (now - (window.__lastBlurTime || 0)) <= 3500;
            if (window.__isAppInBackground === true || window.__windowHasBlur === true || isBlurRecent) {
              return;
            }

            // 5. In foreground: Differentiate deliberate user pause button taps from OS minimize / blur transitions
            var isRecentPauseTap = (now - (window.__lastPauseButtonTapTime || 0)) <= 800 ||
                                   (now - (window.__lastPlayerInteractionTime || 0)) <= 800;
            if (!isRecentPauseTap) {
              return; // Suppress automated backgrounding, blur, or timeout pause!
            }

            // 6. Deliberate user pause in foreground:
            window.__userWantsPaused = true;
            return origMediaPause.apply(this, arguments);
          };
        } catch(e) {}

        // 7.1. Wrap YouTube player object pauseVideo API
        window.__ytwrWrapPlayer = function(player) {
          if (!player || player.__ytwrPauseWrapped) return;
          player.__ytwrPauseWrapped = true;
          var origPauseVideo = player.pauseVideo;
          if (typeof origPauseVideo === 'function') {
            player.pauseVideo = function() {
              if (window.__isRemotePauseCommand === true) {
                return origPauseVideo.apply(this, arguments);
              }
              var now = Date.now();
              var isBlurRecent = (now - (window.__lastBlurTime || 0)) <= 3500;
              if (window.__isAppInBackground === true || window.__windowHasBlur === true || isBlurRecent) {
                return;
              }
              var isRecentPauseTap = (now - (window.__lastPauseButtonTapTime || 0)) <= 800 ||
                                     (now - (window.__lastPlayerInteractionTime || 0)) <= 800;
              if (!isRecentPauseTap) {
                return;
              }
              return origPauseVideo.apply(this, arguments);
            };
          }
        };
        try {
          var initialPlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
          if (initialPlayer) window.__ytwrWrapPlayer(initialPlayer);
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
            get: function() {
              var v = document.querySelector('#movie_player video, .html5-video-player video, #player video, video.video-stream, video');
              if (v) {
                return (!v.paused && !v.ended) ? 'playing' : 'paused';
              }
              return _playbackState;
            },
            set: function(val) {
              _playbackState = val;
              // Do NOT send conflicting PLAYBACK_STATE_UPDATE messages that contradict the actual <video> element.
              // Physical <video> element DOM events via reportMediaState are the sole source of truth.
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

      function isMainPlayerVideo(video) {
        if (!video) return false;
        var isPreview = !!(video.closest && video.closest(
          '.inline-preview, ytd-video-preview, ytm-video-preview, ytm-media-item, ' +
          'ytm-playlist-media-item, ytd-rich-item-renderer, ytd-compact-video-renderer, ' +
          '.video-preview, .feed-item-preview'
        ));
        if (isPreview) return false;

        var isPlayerContainer = !!(video.closest && video.closest(
          '#movie_player, .html5-video-player, #player, .player-container, #player-container-id, ' +
          '.video-player, ytm-custom-control, ytm-mobile-player-overlay-renderer, ytm-watch'
        ));
        if (isPlayerContainer) return true;

        var isMainVideoEl = video.classList && (video.classList.contains('video-stream') || video.classList.contains('html5-main-video'));
        if (isMainVideoEl) return true;

        var path = window.location.pathname || '';
        return path.indexOf('/watch') !== -1 || path.indexOf('/embed') !== -1 || path.indexOf('/live') !== -1 || path.indexOf('/shorts') !== -1;
      }

      function unmuteAudio(video) {
        if (!video || !isMainPlayerVideo(video)) return;
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
              player.unMute();
            }
            if (typeof player.getVolume === 'function' && player.getVolume() === 0) {
              player.setVolume(100);
            }
          }
        } catch(e) {}
      }

      function attachToVideo(video) {
        if (!video || !isMainPlayerVideo(video) || video.__ytwrAttached) return;
        video.__ytwrAttached = true;

        try {
          var p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
          if (p && typeof window.__ytwrWrapPlayer === 'function') {
            window.__ytwrWrapPlayer(p);
          }
        } catch(_) {}

        var events = ['play', 'playing', 'pause', 'ended', 'timeupdate', 'loadedmetadata', 'ratechange'];
        events.forEach(function(ev) {
          video.addEventListener(ev, function() {
            if (ev === 'play' || ev === 'playing') {
              window.__userWantsPaused = false;
              unmuteAudio(video);
            } else if (ev === 'timeupdate' && !video.paused) {
              window.__userWantsPaused = false;
            } else if (ev === 'pause') {
              // Auto-recovery: If video pauses in background without intentional user pause command
              if (window.__isAppInBackground === true && !window.__userWantsPaused) {
                setTimeout(function() {
                  if (video.paused && !video.ended && !window.__userWantsPaused) {
                    video.play().catch(function(){});
                    var p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
                    if (p && typeof p.playVideo === 'function') p.playVideo();
                  }
                }, 40);
              }
            }
            reportMediaState(video, ev !== 'timeupdate');
          });
        });

        if (!video.paused) {
          unmuteAudio(video);
          reportMediaState(video, true);
        }
      }

      // Initial check strictly on main player videos
      document.querySelectorAll('#movie_player video, .html5-video-player video, #player video, video.video-stream').forEach(attachToVideo);

      // Mutation observer for dynamic video element changes
      try {
        var observer = new MutationObserver(function() {
          document.querySelectorAll('video').forEach(function(v) {
            if (isMainPlayerVideo(v)) {
              attachToVideo(v);
            }
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
          var v = document.querySelector('#movie_player video, .html5-video-player video, #player video, video.video-stream, video');
          if (v && isMainPlayerVideo(v)) {
            attachToVideo(v);
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

      // Background Media Session Sync: Periodically ensure playing media state stays synchronized with native service
      setInterval(function() {
        if (window.__isAppInBackground === true && !window.__userWantsPaused) {
          var v = document.querySelector('#movie_player video, .html5-video-player video, #player video, video.video-stream, video');
          if (v && isMainPlayerVideo(v) && !v.paused && !v.ended) {
            reportMediaState(v, false);
          }
        }
      }, 2000);
    })();
  `;
}

export function getRemoteControlScript(action: string, position?: number): string {
  const safePosition = typeof position === 'number' && !isNaN(position) ? position : 0;
  return `
    (function() {
      try {
        function getTargetVideo() {
          var videos = document.querySelectorAll('video');
          for (var i = 0; i < videos.length; i++) {
            var v = videos[i];
            var isPreview = !!(v.closest && v.closest(
              '.inline-preview, ytd-video-preview, ytm-video-preview, ytm-media-item, ' +
              'ytm-playlist-media-item, ytd-rich-item-renderer, ytd-compact-video-renderer, ' +
              '.video-preview, .feed-item-preview'
            ));
            if (!isPreview) return v;
          }
          return document.querySelector('#movie_player video, .html5-video-player video, #player video, video.video-stream, video');
        }

        function getTargetPlayer() {
          return document.getElementById('movie_player') ||
                 document.querySelector('.html5-video-player') ||
                 document.getElementById('player') ||
                 document.querySelector('.video-player');
        }

        var video = getTargetVideo();
        var player = getTargetPlayer();
        var actions = window.__ytwrMediaActions || {};

        switch ('${action}') {
          case 'PLAY':
            window.__userWantsPaused = false;
            window.__isRemotePlayCommand = true;
            window.__isRemotePauseCommand = false;
            if (player) {
              try {
                if (typeof player.unMute === 'function' && typeof player.isMuted === 'function' && player.isMuted()) player.unMute();
                if (typeof player.setVolume === 'function' && typeof player.getVolume === 'function' && player.getVolume() === 0) player.setVolume(100);
                if (typeof player.playVideo === 'function') player.playVideo();
              } catch(e) {}
            }
            if (typeof actions['play'] === 'function') {
              try { actions['play'](); } catch(e) {}
            }
            if (video) {
              try {
                if (video.muted) video.muted = false;
                if (typeof video.volume === 'number' && video.volume === 0) video.volume = 1.0;
                video.play().catch(function(){});
              } catch(e) {}
            }
            break;

          case 'PAUSE':
            window.__userWantsPaused = true;
            window.__isRemotePauseCommand = true;
            window.__isRemotePlayCommand = false;
            if (player && typeof player.pauseVideo === 'function') {
              try { player.pauseVideo(); } catch(e) {}
            }
            if (typeof actions['pause'] === 'function') {
              try { actions['pause'](); } catch(e) {}
            }
            if (video) {
              try { video.pause(); } catch(e) {}
            }
            break;

          case 'FAST_FORWARD':
            var curF = video && typeof video.currentTime === 'number' ? video.currentTime : 0;
            var durF = video && typeof video.duration === 'number' && isFinite(video.duration) ? video.duration : Infinity;
            var newTimeF = Math.min(durF, curF + 10);
            if (player && typeof player.seekTo === 'function') {
              try { player.seekTo(newTimeF, true); } catch(e) {}
            }
            if (video) {
              try { video.currentTime = newTimeF; } catch(e) {}
            }
            if (typeof actions['seekforward'] === 'function') {
              try { actions['seekforward']({ seekOffset: 10 }); } catch(e) {}
            }
            break;

          case 'REWIND':
            var curR = video && typeof video.currentTime === 'number' ? video.currentTime : 0;
            var newTimeR = Math.max(0, curR - 10);
            if (player && typeof player.seekTo === 'function') {
              try { player.seekTo(newTimeR, true); } catch(e) {}
            }
            if (video) {
              try { video.currentTime = newTimeR; } catch(e) {}
            }
            if (typeof actions['seekbackward'] === 'function') {
              try { actions['seekbackward']({ seekOffset: 10 }); } catch(e) {}
            }
            break;

          case 'SEEK_TO':
            if (player && typeof player.seekTo === 'function') {
              try { player.seekTo(${safePosition}, true); } catch(e) {}
            }
            if (video) {
              try { video.currentTime = ${safePosition}; } catch(e) {}
            }
            if (typeof actions['seekto'] === 'function') {
              try { actions['seekto']({ seekTime: ${safePosition} }); } catch(e) {}
            }
            break;

          case 'SKIP_NEXT':
            if (player && typeof player.nextVideo === 'function') {
              try { player.nextVideo(); } catch(e) {}
            }
            if (typeof actions['nexttrack'] === 'function') {
              try { actions['nexttrack'](); } catch(e) {}
            }
            var nextBtn = document.querySelector(
              '.ytp-next-button, button[aria-label*="Next" i], ytm-next-button, .item-thumbnail-next, .navigation-endpoint[aria-label*="Next" i]'
            );
            if (nextBtn) {
              try { nextBtn.click(); } catch(e) {}
            }
            break;

          case 'SKIP_PREV':
            if (player && typeof player.previousVideo === 'function') {
              try { player.previousVideo(); } catch(e) {}
            }
            if (typeof actions['previoustrack'] === 'function') {
              try { actions['previoustrack'](); } catch(e) {}
            }
            var prevBtn = document.querySelector(
              '.ytp-prev-button, button[aria-label*="Previous" i], ytm-prev-button'
            );
            if (prevBtn) {
              try { prevBtn.click(); } catch(e) {}
            } else if (video && video.currentTime > 3) {
              video.currentTime = 0;
            } else {
              window.history.back();
            }
            break;

          case 'STOP':
            window.__userWantsPaused = true;
            window.__isRemotePauseCommand = true;
            if (player && typeof player.stopVideo === 'function') {
              try { player.stopVideo(); } catch(e) {}
            } else if (player && typeof player.pauseVideo === 'function') {
              try { player.pauseVideo(); } catch(e) {}
            }
            if (video) {
              try { video.pause(); } catch(e) {}
            }
            break;
        }
      } catch(e) {
        console.error('[Remote Control Error]', e);
      }
    })();
    true;
  `;
}
