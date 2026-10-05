/**
 * Injected JavaScript for YouTube Video Player:
 * - Pure GPU transform scaling around center: zero layout interference, zero black screen stalls.
 * - Persistent CSS <style> zoom override tag: prevents YouTube's script from resetting scale on touchEnd in landscape mode.
 * - Multi-touch transition guard: eliminates accidental 2x speed trigger and swipe-up suggested videos drawer.
 * - Eradicates YouTube bottom 20-30% engagement peek drawer in landscape mode.
 * - Eradicates YouTube Mobile header in landscape mode so video has 100% of upper screen real estate.
 * - Disables YouTube ambient cinematic blur canvases to prevent full-screen blurring.
 * - Micro-overscan in vertical portrait mode (1.02x): completely eliminates 1px-2px black lines on top/bottom.
 * - Smooth 2-finger pinch gesture with ghost click suppression and strict zoom scale retention.
 * - Center double-tap toggle between Original and Zoomed to fill.
 * - Solid high-contrast frosted acrylic pill toast with ZERO backdrop-filter (eliminates Android Chromium GPU blur).
 * - Fullscreen state synchronization with React Native bridge for clean hardware back button handling.
 */
export function getZoomRuntimeScript(): string {
  return `
(function() {
  if (window.__ytPinchZoomLoaded) return;
  window.__ytPinchZoomLoaded = true;

  var currentMode = 'fit'; // 'fit' | 'fill' | 'custom'
  var currentScale = 1.0;
  var isPinching = false;
  var hasPinched = false;
  var initialDist = 0;
  var startScale = 1.0;
  var activePinchScale = 1.0;
  var lastTapTime = 0;
  var suppressClickUntil = 0;
  var suppressGestureUntil = 0;
  var toastTimeout = null;

  // Injected CSS: Clean borders, landscape header removal, disable ambient blur canvas, eradicate bottom drawer & 2x overlay
  var style = document.createElement('style');
  style.id = 'yt-zoom-clean-styles';
  style.textContent = [
    '#player, #player-container-id, .player-container, .html5-video-player {',
    '  box-shadow: none !important;',
    '  border: none !important;',
    '  outline: none !important;',
    '}',
    '.html5-video-player video {',
    '  box-sizing: border-box !important;',
    '  border: none !important;',
    '  outline: none !important;',
    '}',
    '/* Disable YouTube ambient/cinematic lighting blur canvases that cause full-screen blurring */',
    '#cinematic-container,',
    '.ytp-cinematic-container,',
    '.ytm-cinematic-container,',
    '.html5-video-player.playing-mode .ytp-cued-thumbnail-overlay {',
    '  display: none !important;',
    '  visibility: hidden !important;',
    '  opacity: 0 !important;',
    '  pointer-events: none !important;',
    '}',
    '/* Hide 2x speedmaster press-and-hold overlay */',
    '.ytp-speedmaster-overlay,',
    '.ytp-speedmaster,',
    '.ytp-speed-2x,',
    '.ytp-speedmaster-indicator {',
    '  display: none !important;',
    '  visibility: hidden !important;',
    '  opacity: 0 !important;',
    '  pointer-events: none !important;',
    '}',
    '/* Hide suggested video overlay on pause */',
    '.html5-video-player .ytp-pause-overlay,',
    '.html5-video-player .ytp-expand-pause-overlay {',
    '  display: none !important;',
    '  visibility: hidden !important;',
    '  opacity: 0 !important;',
    '  pointer-events: none !important;',
    '}',
    '/* In landscape mode: remove YouTube Mobile topbar header and bottom 20-30% drawer completely */',
    '@media (orientation: landscape) {',
    '  ytm-mobile-topbar-renderer,',
    '  .mobile-topbar-header,',
    '  .ytm-mobile-topbar-renderer,',
    '  #header-bar,',
    '  header.mobile-topbar-header {',
    '    display: none !important;',
    '    height: 0 !important;',
    '    min-height: 0 !important;',
    '    max-height: 0 !important;',
    '    visibility: hidden !important;',
    '    pointer-events: none !important;',
    '  }',
    '  /* Eradicate suggested videos drawer & bottom 20-30% peek sheet in landscape */',
    '  ytm-engagement-panel,',
    '  .ytm-engagement-panel,',
    '  .fullscreen-engagement-panel,',
    '  [visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"],',
    '  .ytp-drawer,',
    '  .ytp-suggested-action,',
    '  ytm-bottom-sheet-renderer,',
    '  .ytm-bottom-sheet-renderer {',
    '    display: none !important;',
    '    visibility: hidden !important;',
    '    opacity: 0 !important;',
    '    height: 0 !important;',
    '    max-height: 0 !important;',
    '    pointer-events: none !important;',
    '  }',
    '}'
  ].join('\\n');
  (document.head || document.documentElement).appendChild(style);

  // Dedicated dynamic stylesheet for video zoom override
  // Using an !important CSS rule in a stylesheet prevents YouTube's inline scripts from wiping out transform on touchEnd
  var zoomStyleTag = document.createElement('style');
  zoomStyleTag.id = 'yt-video-zoom-override';
  (document.head || document.documentElement).appendChild(zoomStyleTag);

  function syncZoomStylesheet(scale, transitionEnabled) {
    var transitionVal = transitionEnabled ? 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none';
    zoomStyleTag.textContent = [
      '.html5-video-player video,',
      '#player video,',
      '#movie_player video,',
      'video.video-stream,',
      'video {',
      '  transform-origin: center center !important;',
      '  transform: scale(' + scale + ') !important;',
      '  transition: ' + transitionVal + ' !important;',
      '}'
    ].join('\\n');
  }

  // Force close any accidental bottom drawers or suggested video panels
  function closeEngagementPanels() {
    try {
      var panels = document.querySelectorAll(
        'ytm-engagement-panel, .ytm-engagement-panel, [visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"], ' +
        '.ytp-pause-overlay, .ytp-expand-pause-overlay, ytm-bottom-sheet-renderer'
      );
      for (var i = 0; i < panels.length; i++) {
        var p = panels[i];
        if (p) {
          p.setAttribute('visibility', 'ENGAGEMENT_PANEL_VISIBILITY_HIDDEN');
          p.removeAttribute('opened');
        }
      }
      var closeBtns = document.querySelectorAll(
        'ytm-engagement-panel button[aria-label*="close" i], ' +
        '.ytm-engagement-panel button[aria-label*="close" i], ' +
        'button[aria-label*="Close panel" i], ' +
        '.ytp-drawer-close-button'
      );
      for (var c = 0; c < closeBtns.length; c++) {
        try { closeBtns[c].click(); } catch(e) {}
      }
    } catch(e) {}
  }

  // Reset playback rate if YouTube accidentally triggered press-and-hold 2x speed
  function resetPlaybackRateIf2x() {
    try {
      var videos = document.querySelectorAll('video');
      for (var i = 0; i < videos.length; i++) {
        if (videos[i].playbackRate === 2.0) {
          videos[i].playbackRate = 1.0;
        }
      }
    } catch(e) {}
  }

  // Intercept ratechange event to stop accidental 2x speed locks during gestures
  document.addEventListener('ratechange', function(e) {
    var v = e.target;
    if (v && v.tagName === 'VIDEO') {
      if ((isPinching || hasPinched || Date.now() < suppressGestureUntil) && v.playbackRate === 2.0) {
        v.playbackRate = 1.0;
      }
    }
  }, true);

  // Frosted Toast Pill (Zero backdrop-filter to prevent Android Chromium GPU compositor blur)
  function showToast(text) {
    var toast = document.getElementById('yt-zoom-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'yt-zoom-toast';
      toast.style.cssText = [
        'position: fixed',
        'top: 24px',
        'left: 50%',
        'transform: translateX(-50%) translateY(0px)',
        'background: rgba(22, 22, 22, 0.94)',
        'color: #FFFFFF',
        'padding: 7px 18px',
        'border-radius: 20px',
        'font-family: Roboto, -apple-system, sans-serif',
        'font-size: 13px',
        'font-weight: 600',
        'letter-spacing: 0.2px',
        'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6)',
        'z-index: 2147483647',
        'pointer-events: none !important',
        'user-select: none !important',
        '-webkit-user-select: none !important',
        'opacity: 0',
        'display: none',
        'transition: opacity 0.2s ease-out, transform 0.2s ease-out',
        'align-items: center',
        'border: 1px solid rgba(255, 255, 255, 0.2)'
      ].join(';');

      // Append strictly to body, NEVER inside .html5-video-player
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.style.display = 'flex';
    void toast.offsetWidth; // Force layout
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0px)';

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function() {
      if (toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-6px)';
        setTimeout(function() {
          if (toast && toast.style.opacity === '0') {
            toast.style.display = 'none';
          }
        }, 220);
      }
    }, 1400);
  }

  // Calculate dynamic fill scale for wide displays
  function getFillScale() {
    try {
      var player = document.querySelector('.html5-video-player') ||
                   document.querySelector('#player') ||
                   document.querySelector('#player-container-id') ||
                   document.body;
      var rect = player.getBoundingClientRect();
      var pw = rect.width > 0 ? rect.width : window.innerWidth;
      var ph = rect.height > 0 ? rect.height : window.innerHeight;
      var playerAspect = pw / ph;

      var video = document.querySelector('video');
      var vw = (video && video.videoWidth) ? video.videoWidth : 16;
      var vh = (video && video.videoHeight) ? video.videoHeight : 9;
      var videoAspect = vw / vh;

      if (playerAspect > videoAspect) {
        // Wide screen: crops side black bars
        return Math.min(2.5, Math.max(1.1, playerAspect / videoAspect));
      } else if (videoAspect > playerAspect) {
        // Tall screen: crops top/bottom black bars
        return Math.min(2.5, Math.max(1.1, videoAspect / playerAspect));
      }
    } catch (_) {}
    return 1.25;
  }

  // Apply smooth GPU transform scaling around center
  function applyZoom(mode, scale, withToast) {
    currentMode = mode || currentMode || 'fit';
    var isLandscape = window.innerWidth > window.innerHeight;
    var targetScale = 1.0;

    if (currentMode === 'custom') {
      targetScale = typeof scale === 'number' && !isNaN(scale) ? scale : (currentScale > 1.0 ? currentScale : 1.0);
    } else if (currentMode === 'fill') {
      targetScale = getFillScale();
    } else {
      // In portrait mode, 1.02x (2% overscan) cleanly eliminates 1px black line rounding gaps!
      targetScale = isLandscape ? 1.0 : 1.02;
    }
    currentScale = targetScale;

    // 1. Update persistent stylesheet rule (!important)
    syncZoomStylesheet(currentScale, !isPinching);

    // 2. Set inline properties directly
    var videos = document.querySelectorAll('video');
    for (var i = 0; i < videos.length; i++) {
      var v = videos[i];
      v.style.setProperty('transform-origin', 'center center', 'important');
      v.style.transition = isPinching ? 'none' : 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)';
      v.style.setProperty('transform', 'scale(' + currentScale + ')', 'important');
    }

    if (withToast) {
      if (currentMode === 'fill') {
        showToast('Zoomed to fill');
      } else if (currentMode === 'custom') {
        showToast('Zoom: ' + Math.round(currentScale * 100) + '%');
      } else {
        showToast('Original');
      }
    }
  }

  window.__applyVideoZoom = applyZoom;

  // Track Fullscreen state natively via browser fullscreen events
  function handleFullscreenChange() {
    var isFS = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
    if (window.__RN_EXTENSION_BRIDGE__) {
      window.__RN_EXTENSION_BRIDGE__.send('youtube-fullscreen', 'FULLSCREEN_CHANGE', {
        isFullscreen: isFS
      });
    }
    setTimeout(function() {
      applyZoom(currentMode, currentScale, false);
    }, 150);
  }

  document.addEventListener('fullscreenchange', handleFullscreenChange, true);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange, true);

  function getDistance(t1, t2) {
    var dx = t1.clientX - t2.clientX;
    var dy = t1.clientY - t2.clientY;
    return Math.hypot(dx, dy);
  }

  function onTouchStart(e) {
    if (e.touches.length === 2) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      isPinching = true;
      hasPinched = true;
      suppressGestureUntil = Date.now() + 800;
      lastTapTime = 0; // Prevent tap interference
      initialDist = getDistance(e.touches[0], e.touches[1]);
      startScale = currentScale;
      activePinchScale = startScale;

      closeEngagementPanels();
      resetPlaybackRateIf2x();
    } else if (e.touches.length === 1) {
      if (hasPinched || Date.now() < suppressClickUntil || Date.now() < suppressGestureUntil) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }
      // Center double-tap toggle (only middle 36% to preserve 10s seek on left/right)
      var touch = e.touches[0];
      var screenW = window.innerWidth;
      var touchX = touch.clientX;
      var isCenter = touchX > screenW * 0.32 && touchX < screenW * 0.68;

      if (isCenter) {
        var now = Date.now();
        if (now - lastTapTime < 320) {
          var nextMode = currentMode === 'fill' ? 'fit' : 'fill';
          applyZoom(nextMode, 1.0, true);
          lastTapTime = 0;
          return;
        }
        lastTapTime = now;
      }
    }
  }

  function onTouchMove(e) {
    if (isPinching && e.touches.length >= 2) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      var currentDist = getDistance(e.touches[0], e.touches[1]);
      if (initialDist <= 0 || currentDist <= 0) return;

      var ratio = currentDist / initialDist;
      activePinchScale = Math.max(0.85, Math.min(3.0, startScale * ratio));

      // Update stylesheet and inline properties continuously during pinch
      syncZoomStylesheet(activePinchScale, false);

      var videos = document.querySelectorAll('video');
      for (var i = 0; i < videos.length; i++) {
        var v = videos[i];
        v.style.transition = 'none';
        v.style.setProperty('transform-origin', 'center center', 'important');
        v.style.setProperty('transform', 'scale(' + activePinchScale + ')', 'important');
      }

      resetPlaybackRateIf2x();
    } else if (hasPinched || Date.now() < suppressGestureUntil) {
      // Swallowing trailing 1-finger drag movements after pinch release to prevent swipe-up drawers
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }

  function onTouchEnd(e) {
    if (isPinching || hasPinched) {
      // If at least one finger is still touching, swallow event and wait
      if (e.touches && e.touches.length > 0) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }

      // All fingers lifted
      isPinching = false;
      hasPinched = false;
      lastTapTime = 0; // Prevent ghost double-tap
      suppressClickUntil = Date.now() + 600;
      suppressGestureUntil = Date.now() + 800;

      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // Smooth settling: avoid abrupt snap-backs and strictly retain user pinch scale
      if (activePinchScale < 1.03) {
        applyZoom('fit', 1.0, true);
      } else {
        // Strictly keep the user's custom zoom level in landscape and portrait!
        applyZoom('custom', Math.round(activePinchScale * 100) / 100, true);
      }

      resetPlaybackRateIf2x();
      closeEngagementPanels();
    }
  }

  // Intercept and swallow any click events synthesized from finger release after a pinch
  document.addEventListener('click', function(e) {
    if (Date.now() < suppressClickUntil || Date.now() < suppressGestureUntil) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener('touchstart', onTouchStart, { capture: true, passive: false });
  document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
  document.addEventListener('touchend', onTouchEnd, { capture: true, passive: false });
  document.addEventListener('touchcancel', onTouchEnd, { capture: true, passive: false });

  // Guard against YouTube's player script resetting video inline transform
  try {
    var observer = new MutationObserver(function(mutations) {
      if (isPinching) return;
      if (currentScale > 1.03) {
        var videos = document.querySelectorAll('video');
        for (var i = 0; i < videos.length; i++) {
          var v = videos[i];
          var expected = 'scale(' + currentScale + ')';
          if (v.style.getPropertyValue('transform') !== expected) {
            v.style.setProperty('transform-origin', 'center center', 'important');
            v.style.setProperty('transform', expected, 'important');
          }
        }
      }
    });

    var observeTarget = document.getElementById('player') ||
                        document.querySelector('.html5-video-player') ||
                        document.documentElement;
    observer.observe(observeTarget, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  } catch(e) {}

  // Re-apply on video play, resize, or orientation change
  document.addEventListener('loadeddata', function() {
    applyZoom(currentMode, currentScale, false);
  }, true);

  window.addEventListener('resize', function() {
    setTimeout(function() {
      applyZoom(currentMode, currentScale, false);
    }, 150);
  });

  window.addEventListener('orientationchange', function() {
    setTimeout(function() {
      applyZoom(currentMode, currentScale, false);
    }, 150);
  });

  // Initial apply
  applyZoom('fit', 1.0, false);
})();
true;
`;
}
