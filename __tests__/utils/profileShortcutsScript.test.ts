import { getProfileShortcutsScript, getYoutubeProfileScript } from '../../src/utils/profileShortcutsScript';

describe('youtubeProfileScript', () => {
  const script = getYoutubeProfileScript();

  it('generates a valid, non-empty userscript', () => {
    expect(typeof script).toBe('string');
    expect(script.length).toBeGreaterThan(500);
  });

  it('checks for YouTube hostname before executing', () => {
    expect(script).toContain("window.location.hostname.includes('youtube.com')");
  });

  it('includes targeted styles for #ytwr-nav-profile-btn and profile avatar', () => {
    expect(script).toContain('#ytwr-nav-profile-btn');
    expect(script).toContain('.ytwr-profile-avatar-wrap');
    expect(script).toContain('.ytwr-profile-avatar-img');
    expect(script).toContain('.ytwr-profile-avatar-svg');
  });

  it('places profile button after search anchor', () => {
    expect(script).toContain("searchAnchor.insertAdjacentElement('afterend', btn)");
    expect(script).toContain('findSearchAnchor()');
  });

  it('navigates directly to active user profile (/feed/you) on click', () => {
    expect(script).toContain('https://m.youtube.com/feed/you');
    expect(script).toContain('a[href*="/feed/you"]');
  });

  it('dynamically retrieves active avatar image or falls back to SVG icon', () => {
    expect(script).toContain('getAvatarUrl()');
    expect(script).toContain('DEFAULT_SVG_ICON');
    expect(script).toContain('updateAvatarContent');
  });

  it('hides profile button in fullscreen or landscape watch mode', () => {
    expect(script).toContain('html[data-ytwr-fullscreen="true"] #ytwr-nav-profile-btn');
    expect(script).toContain('html[data-ytwr-watch-landscape="true"] #ytwr-nav-profile-btn');
  });

  it('re-syncs on YouTube SPA navigation events', () => {
    expect(script).toContain('yt-navigate-finish');
    expect(script).toContain('popstate');
  });

  it('hides profile button during active search typing or on search results page', () => {
    expect(script).toContain('isSearchBoxActive');
    expect(script).toContain('isResultsPage');
    expect(script).toContain("existingBtn.style.setProperty('display', 'none', 'important')");
  });
});
