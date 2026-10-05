import { ExtensionManifest, BridgeMessage } from '../types/extension';

export class ExtensionEngine {
  /**
   * Helper to check if a URL matches wildcard pattern like *://*.youtube.com/*
   */
  public static matchesUrl(pattern: string, url: string): boolean {
    if (!pattern || pattern === '*' || pattern === '<all_urls>') return true;
    try {
      const escapeRegex = (str: string) => str.replace(/([.+?^=!:${}()|\[\]\/\\])/g, '\\$1');
      const regexStr = '^' + pattern.split('*').map(escapeRegex).join('.*') + '$';
      const regex = new RegExp(regexStr);
      return regex.test(url);
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
   * Generates JavaScript injected BEFORE content loads (for network interception, bridge setup, mocks)
   */
  public static buildBeforeContentLoadedScript(
    extensions: ExtensionManifest[],
    currentUrl: string
  ): string {
    const matching = this.getMatchingExtensions(extensions, currentUrl);

    let script = `
      (function() {
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

    return script;
  }

  /**
   * Generates JavaScript and CSS injected AFTER DOM is ready (for UI styling, DOM observation, skippers)
   */
  public static buildAfterContentLoadedScript(
    extensions: ExtensionManifest[],
    currentUrl: string
  ): string {
    const matching = this.getMatchingExtensions(extensions, currentUrl);

    let cssPayload = '';
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
          // Escape backticks and backslashes for safe template string
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
