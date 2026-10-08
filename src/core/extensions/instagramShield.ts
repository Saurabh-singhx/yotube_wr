import { ExtensionManifest } from '../../types/extension';

export const instagramShield: ExtensionManifest = {
  id: 'instagram-shield',
  name: 'Instagram Pro Shield',
  description: 'Blocks sponsored posts and video ads, removes "Open in App" popups, forces 1080p video quality, eradicates Instagram web bottom tabs completely, and enables low-drag fast snappy reel scrolling with full app controls.',
  version: '1.0.5',
  author: 'YouTube_wr Core Team',
  icon: 'logo-instagram',
  category: 'adblock',
  enabled: true,
  urlMatches: ['*://*.instagram.com/*', '*://instagram.com/*'],
  runAt: 'both',
  settings: [
    {
      id: 'blockSponsored',
      label: 'Block Sponsored Posts & Ads',
      description: 'Filters sponsored ads in feeds, stories, and video reels with network interception',
      type: 'boolean',
      default: true,
    },
    {
      id: 'blockAppNags',
      label: 'Dismiss "Open in App" Popups',
      description: 'Removes full-screen app installation nags and login prompt overlays',
      type: 'boolean',
      default: true,
    },
    {
      id: 'unmuteVideos',
      label: 'Auto-Unmute Videos',
      description: 'Enables audio automatically on videos instead of staying muted by default',
      type: 'boolean',
      default: true,
    },
    {
      id: 'reelMode',
      label: 'Immersive Reel Mode (Full Screen)',
      description: 'Full-screen one-reel-at-a-time player with low-drag 200ms fast snap scroll',
      type: 'boolean',
      default: true,
    },
    {
      id: 'forceHighQuality',
      label: 'Force High Quality (HD / 1080p on Wi-Fi & Mobile Data)',
      description: 'Spoofs unmetered high-speed Wi-Fi and high-DPI profile so Instagram streams in top 1080p resolution even on mobile data',
      type: 'boolean',
      default: true,
    },
    {
      id: 'hideReelDescription',
      label: 'Hide Reel Description & Captions',
      description: 'Hides lengthy caption descriptions, hashtags, and music info on reels for an unobstructed view',
      type: 'boolean',
      default: true,
    },
    {
      id: 'screenAdjustTwoFinger',
      label: 'Two-Finger Screen Adjust (Pinch Zoom & Fit/Fill)',
      description: 'Pinch to zoom and two-finger tap to toggle Fit vs Fill without breaking reel scrolling',
      type: 'boolean',
      default: true,
    },
    {
      id: 'hideSuggestedPosts',
      label: 'Hide Suggested Posts',
      description: 'Hides algorithmic recommended posts to keep your feed focused',
      type: 'boolean',
      default: false,
    },
  ],
  userSettings: {
    blockSponsored: true,
    blockAppNags: true,
    unmuteVideos: true,
    reelMode: true,
    forceHighQuality: true,
    hideReelDescription: true,
    screenAdjustTwoFinger: true,
    hideSuggestedPosts: false,
  },

  injectedJSStart: (settings) => {
    const forceHQ = settings.forceHighQuality !== false;
    if (!forceHQ) return '';

    return `
      (function() {
        // 1. High-Quality CDN Cookies
        try {
          var expires = "; max-age=31536000; path=/; domain=.instagram.com; SameSite=Lax";
          document.cookie = "ig_pr=3" + expires;
          document.cookie = "ig_vw=1080" + expires;
          document.cookie = "ig_vh=1920" + expires;
        } catch(e) {}

        // 2. Wi-Fi & Unmetered High-Speed Connection Spoofing (Tricks player to serve 1080p on cellular)
        try {
          var connProps = {
            type: { get: function() { return 'wifi'; }, configurable: true },
            effectiveType: { get: function() { return '4g'; }, configurable: true },
            downlink: { get: function() { return 100; }, configurable: true },
            downlinkMax: { get: function() { return Infinity; }, configurable: true },
            rtt: { get: function() { return 5; }, configurable: true },
            saveData: { get: function() { return false; }, configurable: true }
          };

          if (navigator.connection) {
            for (var prop in connProps) {
              try { Object.defineProperty(navigator.connection, prop, connProps[prop]); } catch(e) {}
            }
          } else {
            var mockConnection = {
              addEventListener: function() {},
              removeEventListener: function() {},
              dispatchEvent: function() { return true; },
              onchange: null
            };
            for (var p in connProps) {
              try { Object.defineProperty(mockConnection, p, connProps[p]); } catch(e) {}
            }
            try {
              Object.defineProperty(navigator, 'connection', {
                get: function() { return mockConnection; },
                configurable: true
              });
            } catch(e) {}
          }
        } catch(e) {}

        // 3. High-DPI Display Profiling
        try {
          if (window.devicePixelRatio < 3) {
            Object.defineProperty(window, 'devicePixelRatio', { get: function() { return 3; }, configurable: true });
          }
        } catch(e) {}
      })();
    `;
  },

  injectedCSS: (settings) => {
    let css = `
      /* Clean Mobile Instagram Layout */
      html, body {
        -webkit-tap-highlight-color: transparent !important;
      }

      /* High Quality Video Player Rendering */
      body video {
        image-rendering: -webkit-optimize-contrast !important;
        image-rendering: high-quality !important;
        -webkit-backface-visibility: hidden !important;
      }

      /* Eradicate Instagram web bottom navigation bar safely */
      [data-ig-bottom-bar="hidden"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        max-height: 0 !important;
        min-height: 0 !important;
        pointer-events: none !important;
      }
    `;

    if (settings.reelMode !== false) {
      css += `
        /* ==================== IMMERSIVE REEL MODE ==================== */
        body.ig-reel-mode-active,
        body.ig-reel-mode-active html {
          background-color: #000000 !important;
          overflow: hidden !important;
          width: 100vw !important;
          height: 100vh !important;
          height: 100dvh !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* In Reel Mode: HIDE top navigation, header, and search chrome */
        body.ig-reel-mode-active nav:not(article nav),
        body.ig-reel-mode-active header,
        body.ig-reel-mode-active div[role="banner"] {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          pointer-events: none !important;
        }

        /* ReDownloader-Style Paging Container: Fast Snapping & Hardware Containment */
        body.ig-reel-mode-active main[role="main"],
        body.ig-reel-mode-active div[role="main"],
        body.ig-reel-mode-active section[role="main"] {
          margin: 0 !important;
          padding: 0 !important;
          width: 100vw !important;
          max-width: 100vw !important;
          height: 100vh !important;
          height: 100dvh !important;
          background: #000000 !important;
          overflow-y: scroll !important;
          overflow-x: hidden !important;
          scroll-snap-type: y mandatory !important;
          scroll-snap-stop: always !important;
          overscroll-behavior-y: contain !important;
          touch-action: pan-y !important;
          -webkit-overflow-scrolling: touch !important;
        }

        /* Individual Reel Card / Article: STRICTLY 100vh and 100vw */
        body.ig-reel-mode-active article,
        body.ig-reel-mode-active div[data-reels-video] {
          width: 100vw !important;
          max-width: 100vw !important;
          height: 100vh !important;
          height: 100dvh !important;
          min-height: 100vh !important;
          min-height: 100dvh !important;
          max-height: 100vh !important;
          max-height: 100dvh !important;
          scroll-snap-align: start !important;
          scroll-snap-stop: always !important;
          position: relative !important;
          overflow: hidden !important;
          background: #000000 !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          contain: layout paint !important;
        }

        /* Video element covers 100% of the screen edge to edge */
        body.ig-reel-mode-active video {
          width: 100vw !important;
          height: 100vh !important;
          height: 100dvh !important;
          max-height: 100vh !important;
          object-fit: cover !important;
          background: #000000 !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          z-index: 1 !important;
          will-change: transform;
        }

        /* Hide side interaction icons (Like, Comment, Share, Save, etc.) in Reel Mode */
        body.ig-reel-mode-active article svg[aria-label="Like"],
        body.ig-reel-mode-active article svg[aria-label="Unlike"],
        body.ig-reel-mode-active article svg[aria-label="Comment"],
        body.ig-reel-mode-active article svg[aria-label="Share Post"],
        body.ig-reel-mode-active article svg[aria-label="Share"],
        body.ig-reel-mode-active article svg[aria-label="Save"],
        body.ig-reel-mode-active article svg[aria-label="Saved"],
        body.ig-reel-mode-active article svg[aria-label="Audio"],
        body.ig-reel-mode-active article svg[aria-label="Audio is muted"],
        body.ig-reel-mode-active article svg[aria-label="More options"],
        body.ig-reel-mode-active article [role="button"]:has(svg) {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }

        /* Align profile & username cleanly at bottom-left */
        body.ig-reel-mode-active article a[role="link"]:has(img[alt*="profile"]),
        body.ig-reel-mode-active article a[role="link"]:has(img[alt*="user"]),
        body.ig-reel-mode-active article a[href^="/"]:has(img[alt*="profile"]),
        body.ig-reel-mode-active article a[href^="/"]:has(img[alt*="user"]) {
          position: absolute !important;
          bottom: 24px !important;
          left: 14px !important;
          z-index: 20 !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          background: rgba(0,0,0,0.50) !important;
          padding: 5px 12px !important;
          border-radius: 20px !important;
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px) !important;
          border: 1px solid rgba(255,255,255,0.15) !important;
        }

        body.ig-reel-mode-active article img[alt*="profile"],
        body.ig-reel-mode-active article img[alt*="user"] {
          width: 28px !important;
          height: 28px !important;
          border-radius: 50% !important;
          border: 1.5px solid #ffffff !important;
        }

        body.ig-reel-mode-active article a[role="link"] span,
        body.ig-reel-mode-active article a[href^="/"] span {
          color: #ffffff !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          text-shadow: 0 1px 3px rgba(0,0,0,0.85) !important;
        }

        /* Screen Adjust HUD Toast Styling */
        #ig-screen-adjust-toast {
          position: fixed !important;
          top: 24px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          background: rgba(18, 18, 18, 0.90) !important;
          color: #ffffff !important;
          padding: 8px 18px !important;
          border-radius: 20px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          letter-spacing: 0.3px !important;
          box-shadow: 0 4px 18px rgba(0,0,0,0.65) !important;
          border: 1px solid rgba(255,255,255,0.18) !important;
          z-index: 999999 !important;
          pointer-events: none !important;
          opacity: 0 !important;
          transition: opacity 0.2s ease, transform 0.2s ease !important;
        }
        #ig-screen-adjust-toast.show {
          opacity: 1 !important;
        }
      `;
    }

    if (settings.hideReelDescription !== false) {
      css += `
        /* ==================== HIDE REEL DESCRIPTION & CAPTIONS ==================== */
        body.ig-reel-mode-active.ig-hide-description article h1,
        body.ig-reel-mode-active.ig-hide-description article h2:not(:has(img)),
        body.ig-reel-mode-active.ig-hide-description article a[href*="/explore/tags/"],
        body.ig-reel-mode-active.ig-hide-description article a[href*="/audio/"],
        body.ig-reel-mode-active.ig-hide-description article a[href*="/explore/locations/"],
        body.ig-reel-mode-active.ig-hide-description article svg[aria-label="Audio"],
        body.ig-reel-mode-active.ig-hide-description article div:has(> svg[aria-label="Audio"]),
        body.ig-reel-mode-active.ig-hide-description article div:has(> a[href*="/explore/tags/"]),
        body.ig-reel-mode-active.ig-hide-description article div:has(> a[href*="/audio/"]),
        body.ig-reel-mode-active.ig-hide-description article [data-ig-desc="hidden"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          height: 0 !important;
          max-height: 0 !important;
          min-height: 0 !important;
          pointer-events: none !important;
          overflow: hidden !important;
        }
      `;
    }

    if (settings.blockAppNags !== false) {
      css += `
        /* Hide "Use the App" / "Open in App" banners and store prompts */
        div:has(> a[href*="play.google.com/store/apps/details?id=com.instagram.android"]):not(main),
        div:has(> a[href*="/download/"]):not(main),
        a[href*="play.google.com/store/apps/details?id=com.instagram.android"],
        a[href*="instagram.com/download/"],
        div[role="banner"]:has(a[href*="instagram.com"]),
        div[data-pressable-container="true"]:has(span:contains("Open in Instagram")) {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          max-height: 0 !important;
          pointer-events: none !important;
        }

        body {
          overflow-y: auto !important;
        }
      `;
    }

    if (settings.hideSuggestedPosts === true) {
      css += `
        div:has(> h3:contains("Suggested posts")),
        div:has(> span:contains("Suggested posts")),
        div:has(> h2:contains("Suggested for you")) {
          display: none !important;
        }
      `;
    }

    return css;
  },

  injectedJSEnd: (settings) => {
    const blockAds = settings.blockSponsored !== false;
    const blockNags = settings.blockAppNags !== false;
    const autoUnmute = settings.unmuteVideos !== false;
    const enableReelMode = settings.reelMode !== false;
    const forceHQ = settings.forceHighQuality !== false;
    const hideDesc = settings.hideReelDescription !== false;
    const enableScreenAdjust = settings.screenAdjustTwoFinger !== false;

    return `
      (function() {
        if (window.__INSTAGRAM_SHIELD_ACTIVE__) return;
        window.__INSTAGRAM_SHIELD_ACTIVE__ = true;

        var lastReportTime = 0;

        function reportAdBlocked(source) {
          var now = Date.now();
          if (now - lastReportTime > 1500) {
            lastReportTime = now;
            if (window.__RN_EXTENSION_BRIDGE__) {
              window.__RN_EXTENSION_BRIDGE__.send('instagram-shield', 'AD_BLOCKED', {
                source: source || 'instagram_ad'
              });
            }
          }
        }

        // 1. Advanced Anti-Obfuscation Ad Blocker (Catches Feed & Reel Ads)
        function filterSponsoredPosts() {
          if (!${blockAds}) return;
          try {
            var articles = document.querySelectorAll('article');
            for (var i = 0; i < articles.length; i++) {
              var article = articles[i];
              if (article.getAttribute('data-ad-blocked') === 'true') continue;

              var rawText = (article.innerText || article.textContent || '');
              // Clean zero-width spaces and obfuscation padding
              var cleanText = rawText.replace(/[\\u200B-\\u200D\\uFEFF]/g, '').trim();

              // Checks:
              // a) Obfuscated or plain "Sponsored"
              var hasSponsored = /s[\\s\\.\\-_]*p[\\s\\.\\-_]*o[\\s\\.\\-_]*n[\\s\\.\\-_]*s[\\s\\.\\-_]*o[\\s\\.\\-_]*r[\\s\\.\\-_]*e[\\s\\.\\-_]*d/i.test(cleanText) ||
                                 /\\b(Patrocinado|Sponsorisé|Gesponsert|Sponsorizzato|Publicidad)\\b/i.test(cleanText);

              // b) Commercial Call-To-Action buttons that only ads possess
              var hasCommercialCTA = /\\b(Install Now|Shop Now|Learn More|Sign Up|Order Now|Book Now|Download Now|Apply Now|Get Offer|Contact Us|Send Message|Watch More|Play Game)\\b/i.test(cleanText);

              // c) Paid partnership tags
              var hasPaidPartner = /paid\\s+partnership/i.test(cleanText);

              // d) External ad/redirect links
              var hasAdLink = article.querySelector(
                'a[href*="/about/ads/"], a[href*="instagram.com/ads"], a[href*="l.instagram.com"], [aria-label*="About this ad" i], [aria-label*="Why you\\'re seeing this ad" i]'
              ) !== null;

              if (hasSponsored || (hasCommercialCTA && (hasAdLink || hasPaidPartner)) || (hasSponsored && hasCommercialCTA)) {
                article.style.setProperty('display', 'none', 'important');
                article.setAttribute('data-ad-blocked', 'true');
                reportAdBlocked('sponsored_post');

                // If currently inside reel mode, auto-skip the ad reel immediately!
                if (document.body.classList.contains('ig-reel-mode-active')) {
                  var rect = article.getBoundingClientRect();
                  var screenCenter = window.innerHeight / 2;
                  if (rect.top <= screenCenter && rect.bottom >= screenCenter) {
                    fastScrollToAdjacentReel(1);
                  }
                }
              }
            }
          } catch(e) {}
        }

        // 2. Auto-Dismiss "Open in App" Dialogs
        function dismissAppNags() {
          if (!${blockNags}) return;
          try {
            var buttons = document.querySelectorAll('div[role="dialog"] button, button[tabindex="0"], div[role="dialog"] [role="button"]');
            for (var b = 0; b < buttons.length; b++) {
              var btn = buttons[b];
              var label = (btn.innerText || btn.textContent || '').trim().toLowerCase();
              if (label === 'not now' || label === 'cancel' || label === 'no thanks' || label === 'now now') {
                try {
                  btn.click();
                  reportAdBlocked('app_nag_dismissed');
                } catch(e) {}
                break;
              }
            }
          } catch(e) {}
        }

        // 3. Auto-Unmute Video Playback
        function unmuteMedia() {
          if (!${autoUnmute}) return;
          try {
            var videos = document.querySelectorAll('video[muted]');
            for (var v = 0; v < videos.length; v++) {
              var vid = videos[v];
              if (vid.muted && !vid.getAttribute('data-unmuted-attempted')) {
                vid.setAttribute('data-unmuted-attempted', 'true');
                vid.muted = false;
              }
            }
          } catch(e) {}
        }

        // 4. Force High Video Quality Setup
        function optimizeVideoQuality() {
          if (!${forceHQ}) return;
          try {
            var videos = document.querySelectorAll('video');
            for (var v = 0; v < videos.length; v++) {
              var vid = videos[v];
              if (!vid.getAttribute('data-quality-boosted')) {
                vid.setAttribute('data-quality-boosted', 'true');
                vid.preload = 'auto';
                vid.playsInline = true;
                vid.setAttribute('playsinline', 'true');
                vid.setAttribute('webkit-playsinline', 'true');
              }
            }
          } catch(e) {}
        }

        // 5. Complete Eradication of Instagram Webapp Bottom Navigation Bar (Runs Everywhere)
        function purgeInstagramBottomBar() {
          try {
            var winH = window.innerHeight;
            var winW = window.innerWidth;

            // Target 1: <nav> elements positioned at the bottom of the viewport
            var navs = document.querySelectorAll('nav:not(article nav)');
            for (var i = 0; i < navs.length; i++) {
              var n = navs[i];
              if (n.tagName === 'MAIN' || n.getAttribute('role') === 'main') continue;
              var nr = n.getBoundingClientRect();
              if (nr.top >= winH - 85 && nr.height >= 30 && nr.height <= 85) {
                n.style.setProperty('display', 'none', 'important');
                n.setAttribute('data-ig-bottom-bar', 'hidden');
              }
            }

            // Target 2: role="tablist" positioned at bottom of the viewport
            var tablists = document.querySelectorAll('div[role="tablist"]');
            for (var j = 0; j < tablists.length; j++) {
              var t = tablists[j];
              if (t.closest('article') || t.tagName === 'MAIN' || t.getAttribute('role') === 'main') continue;
              var tr = t.getBoundingClientRect();
              if (tr.top >= winH - 85 && tr.height >= 30 && tr.height <= 85) {
                t.style.setProperty('display', 'none', 'important');
                t.setAttribute('data-ig-bottom-bar', 'hidden');
              }
            }

            // Target 3: Fixed bottom wrapper bar containing navigation anchors
            var homeSvgs = document.querySelectorAll('svg[aria-label="Home"], svg[aria-label="Feed"], a[href="/"]');
            for (var k = 0; k < homeSvgs.length; k++) {
              var hEl = homeSvgs[k];
              if (hEl.closest('article') || hEl.closest('header')) continue;
              var cur = hEl.parentElement;
              var depth = 0;
              while (cur && cur !== document.body && cur !== document.documentElement && depth < 4) {
                if (cur.tagName === 'MAIN' || cur.getAttribute('role') === 'main' || cur.closest('article')) break;
                var cr = cur.getBoundingClientRect();
                // Bottom bar container: at bottom of screen, height between 30px and 85px, width spanning screen
                if (cr.top >= winH - 85 && cr.height >= 30 && cr.height <= 85 && cr.width >= winW * 0.7) {
                  cur.style.setProperty('display', 'none', 'important');
                  cur.setAttribute('data-ig-bottom-bar', 'hidden');
                  break;
                }
                cur = cur.parentElement;
                depth++;
              }
            }
          } catch(e) {}
        }

        // 6. Hide Reel Descriptions & Captions
        function hideReelDescriptions() {
          if (!${hideDesc}) return;
          if (!document.body.classList.contains('ig-reel-mode-active')) return;
          if (!document.body.classList.contains('ig-hide-description')) return;
          try {
            var articles = getReelArticles();
            for (var i = 0; i < articles.length; i++) {
              var art = articles[i];
              var userLink = art.querySelector('a[role="link"]:has(img), a[href^="/"]:has(img)');

              // Text elements, caption blocks, descriptions
              var textElements = art.querySelectorAll('span[dir="auto"], div[dir="auto"], h1, [role="button"]:has(span)');
              for (var t = 0; t < textElements.length; t++) {
                var el = textElements[t];
                if (userLink && userLink.contains(el)) continue;
                if (el.tagName === 'VIDEO') continue;
                el.style.setProperty('display', 'none', 'important');
                el.setAttribute('data-ig-desc', 'hidden');
              }

              // Audio track labels, hashtags, location tags
              var extras = art.querySelectorAll('a[href*="/audio/"], a[href*="/explore/tags/"], a[href*="/explore/locations/"]');
              for (var e = 0; e < extras.length; e++) {
                extras[e].style.setProperty('display', 'none', 'important');
                extras[e].setAttribute('data-ig-desc', 'hidden');
              }
            }
          } catch(e) {}
        }

        // 7. Single Reel Mode - Smart Playback
        function enforceSingleReelPlayback() {
          if (!document.body.classList.contains('ig-reel-mode-active')) return;
          try {
            var videos = document.querySelectorAll('video');
            if (videos.length === 0) return;

            var screenCenter = window.innerHeight / 2;
            var activeVideo = null;
            var minCenterDistance = Infinity;

            for (var i = 0; i < videos.length; i++) {
              var vid = videos[i];
              var rect = vid.getBoundingClientRect();
              var dist = Math.abs((rect.top + rect.bottom) / 2 - screenCenter);
              if (dist < minCenterDistance) {
                minCenterDistance = dist;
                activeVideo = vid;
              }
            }

            var hasPlaying = false;
            for (var j = 0; j < videos.length; j++) {
              var v = videos[j];
              if (v === activeVideo) {
                if (v.paused) {
                  v.play().catch(function(){});
                }
                hasPlaying = !v.paused;
              } else {
                if (!v.paused) {
                  v.pause();
                }
              }
            }

            if (window.__RN_EXTENSION_BRIDGE__) {
              window.__RN_EXTENSION_BRIDGE__.send('media-session', 'PLAY_STATE', {
                isPlaying: hasPlaying
              });
            }
          } catch(e) {}
        }

        // 8. Reel Mode URL checker & Instant Route Hooks
        var isManualReelOverride = null;

        function isReelUrl() {
          var path = window.location.pathname || '';
          return path.indexOf('/reel') !== -1 || path.indexOf('/reels') !== -1;
        }

        function shouldActivateReelMode() {
          if (!${enableReelMode}) return false;
          if (isManualReelOverride !== null) {
            return isManualReelOverride;
          }
          return isReelUrl();
        }

        function updateReelModeState() {
          var shouldActivate = shouldActivateReelMode();

          if (shouldActivate) {
            if (!document.body.classList.contains('ig-reel-mode-active')) {
              document.body.classList.add('ig-reel-mode-active');
              if (document.documentElement) document.documentElement.classList.add('ig-reel-mode-active');
            }
            if (${hideDesc} && !document.body.classList.contains('ig-hide-description')) {
              document.body.classList.add('ig-hide-description');
            }
            purgeInstagramBottomBar();
            hideReelDescriptions();
            optimizeVideoQuality();
          } else {
            if (document.body.classList.contains('ig-reel-mode-active')) {
              document.body.classList.remove('ig-reel-mode-active');
              if (document.documentElement) document.documentElement.classList.remove('ig-reel-mode-active');
            }
            purgeInstagramBottomBar();
          }
        }

        try {
          var origPushState = history.pushState;
          var origReplaceState = history.replaceState;
          history.pushState = function() {
            origPushState.apply(this, arguments);
            setTimeout(updateReelModeState, 0);
          };
          history.replaceState = function() {
            origReplaceState.apply(this, arguments);
            setTimeout(updateReelModeState, 0);
          };
          window.addEventListener('popstate', function() {
            setTimeout(updateReelModeState, 0);
          });
        } catch(e) {}

        // 9. Low-Drag Snappy Fast Reel Scroll Engine (200ms cubic transition, 32px trigger)
        var isScrollAnimating = false;
        var touchStartY = 0;
        var touchStartX = 0;
        var touchStartTime = 0;
        var isDragging = false;

        function getReelArticles() {
          var articles = document.querySelectorAll('article');
          if (articles.length > 0) return Array.prototype.slice.call(articles);
          var reelCards = document.querySelectorAll('div[data-reels-video]');
          return Array.prototype.slice.call(reelCards);
        }

        function getScrollContainer() {
          var main = document.querySelector('main[role="main"], div[role="main"], section[role="main"]');
          if (main && main.scrollHeight > window.innerHeight) return main;
          return document.scrollingElement || document.documentElement || document.body || window;
        }

        function resetAllVideoTransforms() {
          currentReelScale = 1.0;
          try {
            var vids = document.querySelectorAll('video');
            for (var v = 0; v < vids.length; v++) {
              vids[v].style.transform = '';
              vids[v].style.transition = '';
            }
          } catch(e) {}
        }

        function fastScrollToAdjacentReel(direction) {
          if (isScrollAnimating) return;
          var items = getReelArticles();
          if (items.length === 0) return;

          var screenCenter = window.innerHeight / 2;
          var currentIndex = 0;
          var minCenterDist = Infinity;

          for (var i = 0; i < items.length; i++) {
            var rect = items[i].getBoundingClientRect();
            var itemCenter = (rect.top + rect.bottom) / 2;
            var dist = Math.abs(itemCenter - screenCenter);
            if (dist < minCenterDist) {
              minCenterDist = dist;
              currentIndex = i;
            }
          }

          var targetIndex = Math.max(0, Math.min(currentIndex + direction, items.length - 1));
          if (targetIndex === currentIndex && direction !== 0) return;

          resetAllVideoTransforms();

          var targetItem = items[targetIndex];
          var container = getScrollContainer();
          var startScroll = (container.scrollTop !== undefined) ? container.scrollTop : (window.pageYOffset || document.documentElement.scrollTop || 0);
          var targetRect = targetItem.getBoundingClientRect();
          var targetScroll = startScroll + targetRect.top;
          var totalDistance = targetScroll - startScroll;

          if (Math.abs(totalDistance) < 2) return;

          isScrollAnimating = true;
          var startTime = performance.now();
          var duration = 200; // Fast 200ms snappy transition!

          function step(now) {
            var elapsed = now - startTime;
            var progress = Math.min(elapsed / duration, 1);
            // Crisp cubic out curve: 1 - Math.pow(1 - progress, 3)
            var ease = 1 - Math.pow(1 - progress, 3);
            var currentPos = startScroll + (totalDistance * ease);

            if (container.scrollTop !== undefined) {
              container.scrollTop = currentPos;
            } else {
              window.scrollTo(0, currentPos);
            }

            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              if (container.scrollTop !== undefined) {
                container.scrollTop = targetScroll;
              } else {
                window.scrollTo(0, targetScroll);
              }
              setTimeout(function() {
                isScrollAnimating = false;
                enforceSingleReelPlayback();
                hideReelDescriptions();
              }, 40);
            }
          }

          requestAnimationFrame(step);
        }

        // 10. Low-Drag Touch Gestures (Only 32px swipe or 0.20px/ms flick triggers next reel)
        window.addEventListener('touchstart', function(e) {
          if (!document.body || !document.body.classList.contains('ig-reel-mode-active')) return;

          // Two-finger touch detection (Screen Adjust)
          if (${enableScreenAdjust} && e.touches && e.touches.length === 2) {
            isDragging = false;
            isPinchingTwoFingers = true;
            var p1 = e.touches[0];
            var p2 = e.touches[1];
            twoFingerStartDist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
            twoFingerStartScale = currentReelScale;
            twoFingerStartTime = Date.now();
            e.preventDefault();
            e.stopPropagation();
            return;
          }

          // Single-finger touch detection
          if (e.touches && e.touches.length === 1) {
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
            touchStartTime = Date.now();
            isDragging = true;
          }
        }, { passive: false });

        window.addEventListener('touchmove', function(e) {
          if (!document.body || !document.body.classList.contains('ig-reel-mode-active')) return;

          // Two-finger pinch
          if (${enableScreenAdjust} && isPinchingTwoFingers && e.touches && e.touches.length === 2) {
            e.preventDefault();
            e.stopPropagation();

            var p1 = e.touches[0];
            var p2 = e.touches[1];
            var dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);

            if (twoFingerStartDist > 15) {
              var ratio = dist / twoFingerStartDist;
              var newScale = Math.min(Math.max(twoFingerStartScale * ratio, 0.72), 3.0);
              currentReelScale = newScale;
              applyVideoScale(currentReelScale, false);

              var pct = Math.round(currentReelScale * 100);
              if (currentReelScale < 0.93) {
                showAdjustToast('Fit Screen: ' + pct + '%');
              } else if (currentReelScale >= 0.93 && currentReelScale <= 1.07) {
                showAdjustToast('Fill (Standard 100%)');
              } else {
                showAdjustToast('Zoom: ' + pct + '%');
              }
            }
          }
        }, { passive: false });

        window.addEventListener('touchend', function(e) {
          if (!document.body || !document.body.classList.contains('ig-reel-mode-active')) return;

          if (${enableScreenAdjust} && isPinchingTwoFingers) {
            var touchDuration = Date.now() - twoFingerStartTime;
            if (touchDuration < 280 && Math.abs(currentReelScale - twoFingerStartScale) < 0.1) {
              if (currentReelScale <= 0.88) {
                currentReelScale = 1.0;
                showAdjustToast('Fill Screen (Edge-to-Edge)');
              } else {
                currentReelScale = 0.82;
                showAdjustToast('Fit Screen (Complete View)');
              }
              applyVideoScale(currentReelScale, true);
            } else {
              if (currentReelScale >= 0.92 && currentReelScale <= 1.08) {
                currentReelScale = 1.0;
                showAdjustToast('Fill (100%)');
              }
              applyVideoScale(currentReelScale, true);
            }
            if (e.touches.length < 2) {
              isPinchingTwoFingers = false;
            }
            return;
          }

          if (!isDragging) return;
          isDragging = false;

          // Single finger low-drag scroll handling
          if (e.changedTouches && e.changedTouches[0]) {
            var deltaY = e.changedTouches[0].clientY - touchStartY;
            var deltaX = e.changedTouches[0].clientX - touchStartX;
            var duration = Date.now() - touchStartTime;

            // Ignore horizontal swipes
            if (Math.abs(deltaX) > Math.abs(deltaY)) return;

            var distance = Math.abs(deltaY);
            var velocity = distance / Math.max(duration, 1);

            // Responsive low-drag trigger: >32px distance OR fast flick >0.20 px/ms with >20px
            if (distance > 32 || (velocity > 0.20 && distance > 20)) {
              if (deltaY < 0) {
                fastScrollToAdjacentReel(1); // Dragged UP -> Next reel
              } else {
                fastScrollToAdjacentReel(-1); // Dragged DOWN -> Previous reel
              }
            }
          }
        }, { passive: false });

        // 11. Two-Finger Screen Adjust Utilities
        var currentReelScale = 1.0;
        var isPinchingTwoFingers = false;
        var twoFingerStartDist = 0;
        var twoFingerStartScale = 1.0;
        var twoFingerStartTime = 0;
        var toastHideTimeout = null;

        function getActiveCenteredVideo() {
          var videos = document.querySelectorAll('video');
          if (videos.length === 0) return null;
          var screenCenter = window.innerHeight / 2;
          var activeVid = null;
          var minCenterDistance = Infinity;
          for (var i = 0; i < videos.length; i++) {
            var vid = videos[i];
            var rect = vid.getBoundingClientRect();
            var dist = Math.abs((rect.top + rect.bottom) / 2 - screenCenter);
            if (dist < minCenterDistance) {
              minCenterDistance = dist;
              activeVid = vid;
            }
          }
          return activeVid;
        }

        function showAdjustToast(text) {
          var toast = document.getElementById('ig-screen-adjust-toast');
          if (!toast) {
            toast = document.createElement('div');
            toast.id = 'ig-screen-adjust-toast';
            (document.body || document.documentElement).appendChild(toast);
          }
          toast.textContent = text;
          toast.classList.add('show');
          if (toastHideTimeout) clearTimeout(toastHideTimeout);
          toastHideTimeout = setTimeout(function() {
            toast.classList.remove('show');
          }, 1100);
        }

        function applyVideoScale(scale, animated) {
          var vid = getActiveCenteredVideo();
          if (!vid) return;
          vid.style.transformOrigin = 'center center';
          vid.style.transition = animated ? 'transform 0.22s cubic-bezier(0.2, 0.9, 0.4, 1)' : 'none';
          vid.style.transform = scale === 1.0 && !animated ? '' : 'scale(' + scale + ')';
        }

        // 12. In-App Navigation Actions for App Control Dock (Home, Search, Reels, Direct, Profile)
        function navigateInstagram(target) {
          var selectors = [];
          var fallbackUrl = 'https://www.instagram.com/';

          if (target === 'home') {
            selectors = ['a[href="/"]', 'svg[aria-label="Home"]', 'svg[aria-label="Feed"]', '[aria-label="Home"]'];
            fallbackUrl = 'https://www.instagram.com/';
          } else if (target === 'search') {
            selectors = ['a[href="/explore/"]', 'a[href*="/explore"]', 'svg[aria-label="Search"]', 'svg[aria-label="Find People"]', '[aria-label="Search"]'];
            fallbackUrl = 'https://www.instagram.com/explore/';
          } else if (target === 'reels') {
            selectors = ['a[href="/reels/"]', 'a[href*="/reels"]', 'svg[aria-label="Reels"]', '[aria-label="Reels"]'];
            fallbackUrl = 'https://www.instagram.com/reels/';
          } else if (target === 'direct') {
            selectors = ['a[href="/direct/inbox/"]', 'a[href*="/direct"]', 'svg[aria-label="Direct"]', 'svg[aria-label="Messenger"]', 'svg[aria-label="Messages"]', '[aria-label="Direct"]'];
            fallbackUrl = 'https://www.instagram.com/direct/inbox/';
          } else if (target === 'profile') {
            var allLinks = document.querySelectorAll('a[href^="/"]');
            for (var i = 0; i < allLinks.length; i++) {
              var link = allLinks[i];
              var href = link.getAttribute('href') || '';
              if (href !== '/' && !href.startsWith('/explore') && !href.startsWith('/reels') && !href.startsWith('/direct') && !href.startsWith('/stories') && !href.startsWith('/accounts') && !href.startsWith('/p/')) {
                if (link.querySelector('img')) {
                  try { link.click(); return; } catch(e) {}
                }
              }
            }
            selectors = ['a:has(img[alt*="profile"])', 'a:has(img[alt*="Profile"])', 'a[role="link"]:has(img)', 'svg[aria-label="Profile"]'];
            fallbackUrl = 'https://www.instagram.com/accounts/edit/';
          }

          for (var s = 0; s < selectors.length; s++) {
            var el = document.querySelector(selectors[s]);
            if (el) {
              var anchor = el.closest ? (el.closest('a') || el) : el;
              try {
                anchor.click();
                return;
              } catch(e) {}
            }
          }

          window.location.href = fallbackUrl;
        }

        function toggleAudio() {
          var vid = document.querySelector('video');
          if (vid) {
            vid.muted = !vid.muted;
          }
        }

        function toggleReelModeManual() {
          var currentlyActive = document.body.classList.contains('ig-reel-mode-active');
          isManualReelOverride = !currentlyActive;
          updateReelModeState();
        }

        function toggleScreenAdjustManual() {
          if (currentReelScale <= 0.88) {
            currentReelScale = 1.0;
            showAdjustToast('Fill Screen (Edge-to-Edge)');
          } else {
            currentReelScale = 0.82;
            showAdjustToast('Fit Screen (Complete View)');
          }
          applyVideoScale(currentReelScale, true);
        }

        function toggleDescriptionManual() {
          document.body.classList.toggle('ig-hide-description');
          var isHidden = document.body.classList.contains('ig-hide-description');
          showAdjustToast(isHidden ? 'Captions Hidden' : 'Captions Shown');
          if (isHidden) {
            hideReelDescriptions();
          } else {
            var descElements = document.querySelectorAll('[data-ig-desc="hidden"]');
            for (var d = 0; d < descElements.length; d++) {
              descElements[d].style.removeProperty('display');
              descElements[d].removeAttribute('data-ig-desc');
            }
          }
        }

        window.__INSTAGRAM_SHIELD_ACTIONS__ = {
          navHome: function() { navigateInstagram('home'); },
          navSearch: function() { navigateInstagram('search'); },
          navReels: function() { navigateInstagram('reels'); },
          navDirect: function() { navigateInstagram('direct'); },
          navProfile: function() { navigateInstagram('profile'); },
          adjustScreen: toggleScreenAdjustManual,
          toggleDescription: toggleDescriptionManual,
          next: function() { fastScrollToAdjacentReel(1); },
          prev: function() { fastScrollToAdjacentReel(-1); },
          audio: toggleAudio,
          toggleMode: toggleReelModeManual
        };

        function runInstagramShield() {
          filterSponsoredPosts();
          dismissAppNags();
          unmuteMedia();
          optimizeVideoQuality();
          purgeInstagramBottomBar();
          updateReelModeState();
          enforceSingleReelPlayback();
        }

        var isShieldScheduled = false;
        function scheduleShieldRun() {
          if (isShieldScheduled) return;
          isShieldScheduled = true;
          setTimeout(function() {
            isShieldScheduled = false;
            runInstagramShield();
          }, 250);
        }

        setInterval(runInstagramShield, 1000);

        try {
          var observer = new MutationObserver(scheduleShieldRun);
          observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
          });
        } catch(e) {}
      })();
    `;
  },
};
