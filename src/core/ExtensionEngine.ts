import { ExtensionManifest, BridgeMessage } from '../types/extension';
import { getBackgroundPlayScript, getMediaObserverScript } from '../utils/mediaSessionScript';

export class ExtensionEngine {
  /**
   * Helper to check if a URL matches wildcard pattern like *://*.youtube.com/*
   */
  public static matchesUrl(pattern: string, url: string): boolean {
    if (!pattern || pattern === '*' || pattern === '<all_urls>') return true;
    try {
      let normalizedUrl = url;
      try {
        normalizedUrl = new URL(url).href;
      } catch {}

      const escapeRegex = (str: string) => str.replace(/([.+?^=!:${}()|\[\]\/\\])/g, '\\$1');
      const regexStr = '^' + pattern.split('*').map(escapeRegex).join('.*') + '$';
      const regex = new RegExp(regexStr);
      if (regex.test(normalizedUrl) || regex.test(url)) return true;

      // Handle patterns ending with /* against origins without trailing slash (e.g. *://m.youtube.com/* vs https://m.youtube.com)
      if (pattern.endsWith('/*')) {
        const originPattern = pattern.slice(0, -2);
        const originRegex = new RegExp('^' + originPattern.split('*').map(escapeRegex).join('.*') + '$');
        const cleanUrl = url.replace(/\/$/, '');
        const cleanNorm = normalizedUrl.replace(/\/$/, '');
        if (originRegex.test(cleanUrl) || originRegex.test(cleanNorm)) {
          return true;
        }
      }

      return false;
    } catch {
      return true;
    }
  }

  /**
   * Returns active extensions matching target URL
   */
  public static getMatchingExtensions(
    extensions: ExtensionManifest[],
    currentUrl: string
  ): ExtensionManifest[] {
    return extensions.filter((ext) => {
      if (!ext.enabled) return false;
      if (!ext.urlMatches || ext.urlMatches.length === 0) return true;
      return ext.urlMatches.some((pattern) => this.matchesUrl(pattern, currentUrl));
    });
  }

  /**
   * Generates dynamic script to immediately switch YouTube between dark and light themes
   */
  public static getThemeToggleScript(isDark: boolean): string {
    return `
      (function() {
        var isDark = ${isDark};
        try {
          if (isDark) {
            document.documentElement.setAttribute('dark', 'true');
            if (document.body) document.body.setAttribute('dark', 'true');
            document.documentElement.style.colorScheme = 'dark';
            document.cookie = "PREF=f6=400; path=/; domain=.youtube.com; max-age=31536000";
          } else {
            document.documentElement.removeAttribute('dark');
            if (document.body) document.body.removeAttribute('dark');
            document.documentElement.style.colorScheme = 'light';
            document.cookie = "PREF=f6=0; path=/; domain=.youtube.com; max-age=31536000";
          }

          var styleId = '__rn_theme_style__';
          var existing = document.getElementById(styleId);
          if (!existing) {
            existing = document.createElement('style');
            existing.id = styleId;
            (document.head || document.documentElement).appendChild(existing);
          }
          existing.textContent = isDark
            ? "html[dark], [dark] { color-scheme: dark !important; --yt-spec-base-background: #0f0f0f !important; --yt-spec-raised-background: #1f1f1f !important; background-color: #0f0f0f !important; }"
            : "html:not([dark]) { color-scheme: light !important; }";

          window.dispatchEvent(new Event('yt-navigate-finish'));
        } catch(e) {
          console.error('[Theme Toggle Error]', e);
        }
      })();
      true;
    `;
  }

  /**
   * Generates JavaScript injected BEFORE content loads (for network interception, bridge setup, mocks, initial theme)
   */
  public static buildBeforeContentLoadedScript(
    extensions: ExtensionManifest[],
    currentUrl: string,
    isDark: boolean = true
  ): string {
    const matching = this.getMatchingExtensions(extensions, currentUrl);
    const isYouTube = currentUrl.includes('youtube.com') || this.matchesUrl('*://*.youtube.com/*', currentUrl);

    let script = `
      (function() {
        // Enforce Initial Theme on Document Start
        var isDark = ${isDark};
        var isYouTube = ${isYouTube};
        try {
          if (isDark) {
            document.documentElement.setAttribute('dark', 'true');
            if (document.body) document.body.setAttribute('dark', 'true');
            document.documentElement.style.colorScheme = 'dark';
            if (isYouTube) {
              document.cookie = "PREF=f6=400; path=/; domain=.youtube.com; max-age=31536000";
              var initDarkStyle = document.createElement('style');
              initDarkStyle.id = '__rn_init_dark_style__';
              initDarkStyle.textContent = 'html, body, #app, ytm-app { background: #0f0f0f !important; color-scheme: dark !important; }';
              (document.head || document.documentElement).appendChild(initDarkStyle);

              // Pre-warm DNS and TLS handshakes for YouTube media and thumbnail CDNs
              try {
                var cdns = [
                  'https://googlevideo.com',
                  'https://i.ytimg.com',
                  'https://yt3.ggpht.com'
                ];
                for (var c = 0; c < cdns.length; c++) {
                  var l1 = document.createElement('link');
                  l1.rel = 'preconnect';
                  l1.href = cdns[c];
                  l1.crossOrigin = 'anonymous';
                  (document.head || document.documentElement).appendChild(l1);

                  var l2 = document.createElement('link');
                  l2.rel = 'dns-prefetch';
                  l2.href = cdns[c];
                  (document.head || document.documentElement).appendChild(l2);
                }
              } catch(e) {}
            }
          } else {
            document.documentElement.removeAttribute('dark');
            if (document.body) document.body.removeAttribute('dark');
            document.documentElement.style.colorScheme = 'light';
            if (isYouTube) {
              document.cookie = "PREF=f6=0; path=/; domain=.youtube.com; max-age=31536000";
            }
          }
        } catch(e) {}

        // Setup Native Extension Bridge
        if (!window.__RN_EXTENSION_BRIDGE__) {
          window.__RN_EXTENSION_BRIDGE__ = {
            send: function(extensionId, type, payload) {
              try {
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    extensionId: extensionId,
                    type: type,
                    payload: payload || {},
                    timestamp: Date.now()
                  }));
                }
              } catch(e) {
                console.error('[RN Bridge Error]', e);
              }
            }
          };
        }
      })();
    `;

    for (const ext of matching) {
      if (ext.injectedJSStart) {
        const settings = ext.userSettings || {};
        const code =
          typeof ext.injectedJSStart === 'function'
            ? ext.injectedJSStart(settings)
            : ext.injectedJSStart;
        if (code && code.trim().length > 0) {
          script += `\n/* Extension Start: ${ext.name} (${ext.id}) */\ntry { ${code} } catch(e) { console.error('[Ext Error: ${ext.id}]', e); }\n`;
        }
      }
    }

    if (currentUrl.includes('youtube.com') || this.matchesUrl('*://*.youtube.com/*', currentUrl)) {
      script += `\n/* Background Playback & MediaSession Setup */\n${getBackgroundPlayScript()}\n`;
    }

    return script;
  }

  /**
   * Generates JavaScript and CSS injected AFTER DOM is ready (for UI styling, DOM observation, skippers, theme persistence)
   */
  public static buildAfterContentLoadedScript(
    extensions: ExtensionManifest[],
    currentUrl: string,
    isDark: boolean = true
  ): string {
    const matching = this.getMatchingExtensions(extensions, currentUrl);
    const isYouTube = currentUrl.includes('youtube.com') || this.matchesUrl('*://*.youtube.com/*', currentUrl);

    let cssPayload = isYouTube
      ? (`
      /* Eradicate redundant mobile YouTube bottom navigation bar behind native BottomDock */
      ytm-pivot-bar-renderer,
      .pivot-bar,
      ytm-pivot-bar-item-renderer {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        max-height: 0 !important;
        pointer-events: none !important;
      }

      /* Ensure feed, browse, watch, and search content can scroll past the floating bottom dock */
      ytm-app, #app, ytm-browse, .tab-content, ytm-watch,
      ytm-search, ytm-search-page, ytm-search-results,
      ytm-section-list-renderer[page-type="search"],
      ytm-item-section-renderer[section-identifier="search-results"] {
        padding-bottom: 84px !important;
      }

      /* YouTube Search Box & Suggestions Enhancement */
      ytm-searchbox {
        margin: 0 !important;
        padding: 4px 8px !important;
      }
      .searchbox-input,
      ytm-searchbox input,
      input[name="search_query"] {
        font-size: 15px !important;
        border-radius: 20px !important;
        padding: 8px 14px !important;
        outline: none !important;
      }
      html[dark] .searchbox-input,
      html[dark] ytm-searchbox input,
      html[dark] input[name="search_query"] {
        background: #202020 !important;
        color: #f1f1f1 !important;
        border: 1px solid rgba(255, 255, 255, 0.18) !important;
      }
      html:not([dark]) .searchbox-input,
      html:not([dark]) ytm-searchbox input,
      html:not([dark]) input[name="search_query"] {
        background: #f2f2f2 !important;
        color: #0f0f0f !important;
        border: 1px solid rgba(0, 0, 0, 0.14) !important;
      }
      /* Search Autocomplete Suggestions */
      ytm-search-suggestions-section-renderer,
      .search-suggestions,
      .sbdd_b {
        border-radius: 0 0 16px 16px !important;
        overflow: hidden !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
      }
      html[dark] ytm-search-suggestions-section-renderer,
      html[dark] .search-suggestions,
      html[dark] .sbdd_b,
      html[dark] .sbsb_a {
        background: #181818 !important;
        color: #f1f1f1 !important;
      }
      html[dark] ytm-search-suggestion,
      html[dark] .sbsb_c,
      html[dark] .sbsb_c *,
      html[dark] .sbqs_c,
      html[dark] .sbqs_c b,
      html[dark] ytm-search-suggestion * {
        background: transparent !important;
        color: #f1f1f1 !important;
      }
      html[dark] ytm-search-suggestion:active,
      html[dark] .sbsb_c:active,
      html[dark] .sbsb_c.gsfs_c {
        background: #272727 !important;
      }
      html[dark] .search-suggestion-icon,
      html[dark] ytm-search-suggestion svg,
      html[dark] .sbsb_c svg {
        fill: #aaaaaa !important;
        color: #aaaaaa !important;
      }
      html[dark] .searchbox-clear-button,
      html[dark] button[aria-label*="Clear" i] {
        color: #f1f1f1 !important;
        fill: currentColor !important;
      }

      /* Comments Engagement Panel & Bottom Sheet Aesthetics */
      ytm-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"],
      ytm-engagement-panel-section-list-renderer[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"],
      .engagement-panel-container {
        border-top-left-radius: 18px !important;
        border-top-right-radius: 18px !important;
        overflow: hidden !important;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.35) !important;
      }
      html[dark] ytm-engagement-panel-section-list-renderer,
      html[dark] .engagement-panel-container,
      html[dark] ytm-engagement-panel-title-header-renderer,
      html[dark] ytm-comments-header-renderer {
        background: #121212 !important;
        color: #f1f1f1 !important;
      }
      /* Comments Content Clearance for Floating Dock & Input Box */
      ytm-comment-section-renderer,
      ytm-comments-header-renderer + *,
      .engagement-panel-container ytm-section-list-renderer {
        padding-bottom: 96px !important;
      }
      /* Comment Thread Typography & Ergonomics */
      ytm-comment-thread-renderer,
      ytm-comment-renderer {
        padding: 10px 14px !important;
        border-bottom: 1px solid rgba(128, 128, 128, 0.14) !important;
      }
      .comment-text,
      ytm-comment-renderer .comment-text {
        font-size: 14px !important;
        line-height: 1.48 !important;
        color: inherit !important;
      }
      html[dark] .comment-text,
      html[dark] ytm-comment-renderer .comment-text {
        color: #e2e2e2 !important;
      }
      .comment-header .comment-author,
      ytm-comment-renderer .comment-author {
        font-weight: 600 !important;
        font-size: 13px !important;
      }
      html[dark] .comment-header .comment-author,
      html[dark] ytm-comment-renderer .comment-author {
        color: #f1f1f1 !important;
      }
      html[dark] .comment-time,
      html[dark] ytm-comment-renderer .comment-time {
        color: #aaaaaa !important;
        font-size: 12px !important;
      }
      /* Comment Composer / Input Bar */
      ytm-comment-simplebox-renderer {
        border-top: 1px solid rgba(128, 128, 128, 0.2) !important;
        padding: 10px 14px !important;
      }
      html[dark] ytm-comment-simplebox-renderer {
        background: #1e1e1e !important;
      }
      /* Comments Sheet Close Touch Target */
      ytm-engagement-panel-section-list-renderer button[aria-label*="Close" i],
      .engagement-panel-close-button {
        min-width: 44px !important;
        min-height: 44px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      /* Ensure YouTube top header account, profile, and settings buttons are always visible and clickable */
      ytm-header-bar a[href*="/account"],
      ytm-header-bar a[href*="/signin"],
      ytm-header-bar button[aria-label*="Account" i],
      ytm-header-bar button[aria-label*="Settings" i],
      ytm-header-bar .header-bar-button {
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }

      /* Eradicate 300ms touch-to-click delay across all links, buttons, and video thumbnails */
      html, body, a, button, [role="button"], ytm-media-item, .media-item-thumbnail-container,
      .compact-media-item, ytm-compact-video-renderer, ytd-thumbnail, #thumbnail,
      .video-thumbnail-container, .ytm-media-item {
        touch-action: manipulation !important;
      }

      /* Dismiss first-install consent dialogs, mealbar banners & app prompts */
      ytm-mealbar-promo-renderer,
      yt-mealbar-promo-renderer,
      ytm-consent-bump-v2-renderer,
      ytd-consent-bump-v2-lightbox,
      #consent-bump,
      .consent-bump,
      ytm-app-banner,
      .ytm-app-banner,
      ytm-upsell-dialog-renderer,
      .ytm-upsell-dialog-renderer {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    ` + (isDark
      ? `
        html[dark], [dark] {
          color-scheme: dark !important;
          --yt-spec-base-background: #0f0f0f !important;
          --yt-spec-raised-background: #1f1f1f !important;
          --yt-spec-menu-background: #282828 !important;
          --yt-spec-text-primary: #f1f1f1 !important;
          --yt-spec-text-secondary: #aaaaaa !important;
          background-color: #0f0f0f !important;
        }
      `
      : `
        html:not([dark]) {
          color-scheme: light !important;
        }
      `))
      : '';

    let jsEndPayload = '';

    for (const ext of matching) {
      const settings = ext.userSettings || {};

      // Collect CSS
      if (ext.injectedCSS) {
        const cssContent =
          typeof ext.injectedCSS === 'function'
            ? ext.injectedCSS(settings)
            : ext.injectedCSS;
        if (cssContent && cssContent.trim().length > 0) {
          const safeCss = cssContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
          cssPayload += `\n/* ${ext.name} */\n${safeCss}\n`;
        }
      }

      // Collect JS End
      if (ext.injectedJSEnd) {
        const jsContent =
          typeof ext.injectedJSEnd === 'function'
            ? ext.injectedJSEnd(settings)
            : ext.injectedJSEnd;
        if (jsContent && jsContent.trim().length > 0) {
          jsEndPayload += `\n/* Extension End: ${ext.name} (${ext.id}) */\ntry { ${jsContent} } catch(e) { console.error('[Ext Error: ${ext.id}]', e); }\n`;
        }
      }
    }

    return `
      (function() {
        var isDark = ${isDark};
        var isYouTube = ${isYouTube};

        // Enforce YouTube Theme
        function enforceTheme() {
          try {
            if (isDark) {
              document.documentElement.setAttribute('dark', 'true');
              if (document.body) document.body.setAttribute('dark', 'true');
              document.documentElement.style.colorScheme = 'dark';
            } else {
              document.documentElement.removeAttribute('dark');
              if (document.body) document.body.removeAttribute('dark');
              document.documentElement.style.colorScheme = 'light';
            }
          } catch(e) {}
        }

        if (isYouTube) {
          // Apply theme immediately
          enforceTheme();
          window.addEventListener('yt-navigate-finish', enforceTheme);
          window.addEventListener('DOMContentLoaded', enforceTheme);

          // MutationObserver to keep theme synchronized if YouTube tries to revert
          try {
            var themeObserver = new MutationObserver(function() {
              if (isDark && !document.documentElement.hasAttribute('dark')) {
                document.documentElement.setAttribute('dark', 'true');
              } else if (!isDark && document.documentElement.hasAttribute('dark')) {
                document.documentElement.removeAttribute('dark');
              }
            });
            themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['dark'] });
          } catch(e) {}
        }

        // Inject Combined CSS
        function applyExtensionStyles() {
          var styleId = '__rn_extension_styles__';
          var existing = document.getElementById(styleId);
          var cssText = \`${cssPayload}\`;
          if (!cssText.trim()) return;

          if (!existing) {
            existing = document.createElement('style');
            existing.id = styleId;
            existing.type = 'text/css';
            (document.head || document.documentElement).appendChild(existing);
          }
          existing.textContent = cssText;
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', applyExtensionStyles);
        } else {
          applyExtensionStyles();
        }

        // Re-apply styles on YouTube SPA navigation
        window.addEventListener('yt-navigate-finish', applyExtensionStyles);
        window.addEventListener('popstate', applyExtensionStyles);

        // Instant Video Playback Accelerator: Starts playback immediately on thumbnail click without mobile cued delay
        if (isYouTube) {
          function kickInstantPlayback() {
            if (window.__userWantsPaused) return;

            // Strictly require an active watch / shorts / live route
            var path = (window.location && window.location.pathname) || '';
            var isWatch = path.indexOf('/watch') !== -1 || path.indexOf('/shorts') !== -1 || path.indexOf('/live') !== -1;
            if (!isWatch) return;

            var video = document.querySelector('#movie_player video, .html5-video-player:not(#inline-preview-player) video, ytm-watch video, ytd-watch-flexy video, video.video-stream');
            if (!video) return;

            // Never kick feed previews or thumbnail hover items
            if (typeof window.__ytwrIsPreviewElement === 'function' && window.__ytwrIsPreviewElement(video)) return;
            if (video.closest && video.closest('.inline-preview, ytd-video-preview, ytm-video-preview, ytm-media-item, ytm-playlist-media-item, ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-video-renderer, ytd-rich-grid-media, ytd-inline-preview-renderer, #inline-preview-player, #inline-player, .video-preview, .feed-item-preview, .thumbnail-container')) {
              return;
            }

            // Never interfere if an ad is actively showing
            var player = document.getElementById('movie_player') ||
                         document.getElementById('player') ||
                         document.querySelector('.html5-video-player');

            if (player) {
              if (player.id === 'inline-preview-player') return;
              try {
                if (typeof player.isAdShowing === 'function' && player.isAdShowing()) return;
              } catch(e) {}
              var cls = player.className || '';
              if (cls.indexOf('ad-showing') !== -1) return;
            }

            // If the player is on a watch page and waiting in a cued or paused state:
            if (video.paused && !video.ended && !window.__userWantsPaused) {
              // Click cued thumbnail overlay or large play button immediately
              var cuedOverlay = document.querySelector('.ytp-cued-thumbnail-overlay, .ytp-large-play-button');
              if (cuedOverlay) {
                try { cuedOverlay.click(); } catch(e) {}
              }

              if (player && typeof player.playVideo === 'function') {
                try { player.playVideo(); } catch(e) {}
              }

              try {
                var p = video.play();
                if (p && typeof p.catch === 'function') p.catch(function(){});
              } catch(e) {}
            }
          }

          window.addEventListener('yt-navigate-finish', function() {
            kickInstantPlayback();
            setTimeout(kickInstantPlayback, 50);
            setTimeout(kickInstantPlayback, 150);
            setTimeout(kickInstantPlayback, 350);
            setTimeout(kickInstantPlayback, 650);
          });

          window.addEventListener('popstate', function() {
            kickInstantPlayback();
            setTimeout(kickInstantPlayback, 80);
          });
        }

        // Execute JS End scripts
        ${jsEndPayload}

        // Media Playback Observer
        ${currentUrl.includes('youtube.com') || this.matchesUrl('*://*.youtube.com/*', currentUrl) ? getMediaObserverScript() : ''}
      })();
      true;
    `;
  }

  /**
   * Safe parser for incoming WebView bridge messages
   */
  public static parseBridgeMessage(eventData: string): BridgeMessage | null {
    try {
      const parsed = JSON.parse(eventData);
      if (parsed && parsed.extensionId && parsed.type) {
        return parsed as BridgeMessage;
      }
      return null;
    } catch {
      return null;
    }
  }
}
