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

    let script = `
      (function() {
        // Enforce Initial Theme on Document Start
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

    let cssPayload = isDark
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
      `;

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
