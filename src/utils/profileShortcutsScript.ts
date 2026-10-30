/**
 * Injected JavaScript to add a small profile & profile button on YouTube's top navigation bar
 * placed immediately after the search button, navigating directly to the user's active YouTube profile (/feed/you).
 */
export function getProfileShortcutsScript(): string {
  return `
(function() {
  if (window.location && !window.location.hostname.includes('youtube.com') && !window.location.hostname.includes('youtu.be')) return;
  if (window.__ytwrProfileNavScriptLoaded && document.getElementById('ytwr-nav-profile-btn')) return;
  window.__ytwrProfileNavScriptLoaded = true;

  var style = document.getElementById('ytwr-profile-nav-styles');
  if (!style) {
    style = document.createElement('style');
    style.id = 'ytwr-profile-nav-styles';
    style.textContent = [
      '#ytwr-nav-profile-btn {',
      '  display: inline-flex !important;',
      '  visibility: visible !important;',
      '  opacity: 1 !important;',
      '  align-items: center !important;',
      '  justify-content: center !important;',
      '  width: 34px !important;',
      '  height: 34px !important;',
      '  min-width: 34px !important;',
      '  min-height: 34px !important;',
      '  max-width: 34px !important;',
      '  max-height: 34px !important;',
      '  border-radius: 50% !important;',
      '  margin-left: 6px !important;',
      '  margin-right: 6px !important;',
      '  padding: 0 !important;',
      '  border: 1px solid rgba(128, 128, 128, 0.3) !important;',
      '  background: rgba(128, 128, 128, 0.15) !important;',
      '  cursor: pointer !important;',
      '  outline: none !important;',
      '  -webkit-tap-highlight-color: transparent !important;',
      '  user-select: none !important;',
      '  flex-shrink: 0 !important;',
      '  vertical-align: middle !important;',
      '  position: relative !important;',
      '  z-index: 9999 !important;',
      '  box-sizing: border-box !important;',
      '  overflow: hidden !important;',
      '  transition: transform 0.12s ease, opacity 0.12s ease !important;',
      '}',
      '#ytwr-nav-profile-btn:active {',
      '  transform: scale(0.9) !important;',
      '  opacity: 0.8 !important;',
      '}',
      '#ytwr-nav-profile-btn .ytwr-profile-avatar-wrap {',
      '  width: 100% !important;',
      '  height: 100% !important;',
      '  border-radius: 50% !important;',
      '  display: flex !important;',
      '  align-items: center !important;',
      '  justify-content: center !important;',
      '  overflow: hidden !important;',
      '  pointer-events: none !important;',
      '}',
      '#ytwr-nav-profile-btn img, .ytwr-profile-avatar-img {',
      '  width: 100% !important;',
      '  height: 100% !important;',
      '  border-radius: 50% !important;',
      '  object-fit: cover !important;',
      '  display: block !important;',
      '}',
      '#ytwr-nav-profile-btn svg, .ytwr-profile-avatar-svg {',
      '  width: 22px !important;',
      '  height: 22px !important;',
      '  display: block !important;',
      '}',
      'html[dark] #ytwr-nav-profile-btn, [dark] #ytwr-nav-profile-btn {',
      '  color: #f1f1f1 !important;',
      '  border-color: rgba(255, 255, 255, 0.28) !important;',
      '  background: rgba(255, 255, 255, 0.12) !important;',
      '}',
      'html:not([dark]) #ytwr-nav-profile-btn {',
      '  color: #0f0f0f !important;',
      '  border-color: rgba(0, 0, 0, 0.2) !important;',
      '  background: rgba(0, 0, 0, 0.06) !important;',
      '}',
      '/* In fullscreen video or landscape watch mode, hide profile button alongside header */',
      'html[data-ytwr-fullscreen="true"] #ytwr-nav-profile-btn,',
      'html[data-ytwr-watch-landscape="true"] #ytwr-nav-profile-btn {',
      '  display: none !important;',
      '}'
    ].join('\\n');
    (document.head || document.documentElement).appendChild(style);
  }

  var DEFAULT_SVG_ICON = \`<svg class="ytwr-profile-avatar-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>\`;

  function findSearchAnchor() {
    // 1. Direct searchbox container custom element (YouTube mobile Lit component, when not in active typing mode)
    var box = document.querySelector('ytm-searchbox, ytm-search-box, .mobile-topbar-header-search');
    var activeInput = box && box.querySelector('input:focus');
    if (box && !activeInput) return box;

    // 2. Candidate buttons / links by class or attribute
    var candidates = [
      'button[aria-label*="Search" i]',
      'a[aria-label*="Search" i]',
      '.topbar-menu-button-search-button',
      '.mobile-topbar-header-search',
      'button.search-button',
      '#header-bar button[aria-label*="search" i]',
      'ytm-mobile-topbar-renderer button[aria-label*="search" i]',
      'a[href*="/results"]',
      'button[aria-label*="खोज" i]'
    ];
    for (var i = 0; i < candidates.length; i++) {
      var el = document.querySelector(candidates[i]);
      if (el) {
        return el.closest('ytm-searchbox, ytm-search-box, .mobile-topbar-header-search') || el;
      }
    }

    // 3. Fallback: inspect SVGs inside header for search glass icon
    var header = document.querySelector('ytm-mobile-topbar-renderer, header.mobile-topbar-header, #header-bar, .mobile-topbar-header');
    if (header) {
      var svgs = header.querySelectorAll('svg');
      for (var j = 0; j < svgs.length; j++) {
        var svgHtml = svgs[j].innerHTML || '';
        if (svgHtml.indexOf('20.87') !== -1 || svgHtml.indexOf('15.5') !== -1 || svgHtml.indexOf('21.71') !== -1 || /search/i.test(svgHtml)) {
          var parentBtn = svgs[j].closest('button, a, ytm-searchbox, ytm-search-box');
          if (parentBtn) {
            return parentBtn.closest('ytm-searchbox, ytm-search-box, .mobile-topbar-header-search') || parentBtn;
          }
        }
      }
    }
    return null;
  }

  function getAvatarUrl() {
    try {
      var youImg = document.querySelector(
        'ytm-pivot-bar-renderer a[href*="/feed/you"] img, ' +
        'ytm-pivot-bar-renderer ytm-pivot-bar-item-renderer:last-child img, ' +
        'a[href*="/feed/you"] img, ' +
        '.pivot-bar-item-tab-avatar, ' +
        'ytm-pivot-bar-renderer img[src*="ggpht.com"], ' +
        'ytm-pivot-bar-renderer img[src*="googleusercontent.com"], ' +
        'img[src*="yt3.ggpht.com"], ' +
        'img[src*="yt3.googleusercontent.com"]'
      );
      if (youImg && youImg.src && youImg.src.indexOf('data:') !== 0) {
        return youImg.src;
      }
      if (window.yt && window.yt.config_ && window.yt.config_.LOGGED_IN_USER_AVATAR) {
        return window.yt.config_.LOGGED_IN_USER_AVATAR;
      }
    } catch(_) {}
    return null;
  }

  function handleProfileClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // 1. Try to click native YouTube 'You' tab in DOM (instant SPA transition)
    var youTab = document.querySelector(
      'ytm-pivot-bar-renderer a[href*="/feed/you"], ' +
      'ytm-pivot-bar-item-renderer:last-child a, ' +
      'a[href*="/feed/you"], ' +
      'a[href="/feed/you"]'
    );
    if (youTab && typeof youTab.click === 'function') {
      youTab.click();
      return;
    }
    // 2. Fallback: navigate directly to /feed/you
    if (window.location.pathname !== '/feed/you') {
      window.location.href = 'https://m.youtube.com/feed/you';
    }
  }

  function updateAvatarContent(btn) {
    var wrap = btn.querySelector('.ytwr-profile-avatar-wrap');
    if (!wrap) return;
    var url = getAvatarUrl();
    if (url) {
      var currentImg = wrap.querySelector('img');
      if (currentImg) {
        if (currentImg.src !== url) currentImg.src = url;
      } else {
        wrap.innerHTML = '<img class="ytwr-profile-avatar-img" src="' + url + '" alt="Profile" />';
      }
    } else {
      if (!wrap.querySelector('svg')) {
        wrap.innerHTML = DEFAULT_SVG_ICON;
      }
    }
  }

  function createProfileButton() {
    var btn = document.createElement('button');
    btn.id = 'ytwr-nav-profile-btn';
    btn.className = 'ytwr-profile-nav-btn';
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', 'YouTube Profile & Account');
    btn.setAttribute('role', 'button');

    var wrap = document.createElement('div');
    wrap.className = 'ytwr-profile-avatar-wrap';
    btn.appendChild(wrap);

    updateAvatarContent(btn);

    btn.addEventListener('click', handleProfileClick, true);
    return btn;
  }

  function syncProfileButton() {
    try {
      if (window.location && !window.location.hostname.includes('youtube.com') && !window.location.hostname.includes('youtu.be')) return;
      if (document.getElementById('avatar-btn')) return; // Desktop YouTube already has avatar-btn

      var existingBtn = document.getElementById('ytwr-nav-profile-btn');

      // If active search query input is open or user is viewing /results, hide profile button to preserve full search bar layout
      var path = (window.location && window.location.pathname) || '';
      var isResultsPage = path.indexOf('/results') !== -1;
      var isSearchBoxActive = !!document.querySelector(
        'ytm-searchbox input:focus, ytm-search-box input:focus, .mobile-topbar-header-search input:focus, ytm-searchbox[opened], ytm-search-box[opened], ytm-searchbox.opened, form.search-form'
      );

      if (isResultsPage || isSearchBoxActive) {
        if (existingBtn) {
          existingBtn.style.setProperty('display', 'none', 'important');
        }
        return;
      }
      if (existingBtn) {
        existingBtn.style.removeProperty('display');
      }

      var searchAnchor = findSearchAnchor();

      if (searchAnchor) {
        if (!existingBtn) {
          var btn = createProfileButton();
          searchAnchor.insertAdjacentElement('afterend', btn);
        } else {
          if (searchAnchor.nextElementSibling !== existingBtn) {
            searchAnchor.insertAdjacentElement('afterend', existingBtn);
          }
          updateAvatarContent(existingBtn);
        }
        return;
      }

      // Fallback: search anchor not found yet, attach to header actions container
      var header = document.querySelector('ytm-mobile-topbar-renderer, header.mobile-topbar-header, #header-bar, .mobile-topbar-header');
      if (header) {
        var actions = header.querySelector('.topbar-header-actions, .mobile-topbar-header-content') || header;
        if (!existingBtn) {
          var newBtn = createProfileButton();
          actions.appendChild(newBtn);
        } else {
          if (!header.contains(existingBtn)) {
            actions.appendChild(existingBtn);
          }
          updateAvatarContent(existingBtn);
        }
      }
    } catch(_) {}
  }

  // Initial mount
  syncProfileButton();

  // Active polling to guarantee injection during asynchronous hydration
  var pollCount = 0;
  var pollInterval = setInterval(function() {
    pollCount++;
    syncProfileButton();
    if (pollCount > 60) {
      clearInterval(pollInterval);
    }
  }, 350);

  // Re-sync on YouTube SPA navigation and lifecycle events
  window.addEventListener('yt-navigate-finish', function() {
    setTimeout(syncProfileButton, 50);
    setTimeout(syncProfileButton, 300);
    setTimeout(syncProfileButton, 800);
  });
  window.addEventListener('popstate', function() {
    setTimeout(syncProfileButton, 50);
    setTimeout(syncProfileButton, 300);
  });
  window.addEventListener('DOMContentLoaded', syncProfileButton);
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) syncProfileButton();
  });

  // Persistent MutationObserver on documentElement
  var syncTimeout = null;
  try {
    var obs = new MutationObserver(function() {
      if (syncTimeout) return;
      syncTimeout = setTimeout(function() {
        syncTimeout = null;
        syncProfileButton();
      }, 150);
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch(_) {}
})();
true;
`;
}

export const getYoutubeProfileScript = getProfileShortcutsScript;
