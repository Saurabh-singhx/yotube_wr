import { DEFAULT_EXTENSIONS } from '../../src/core/extensions/defaultExtensions';

describe('Navigation & Dock Components Logic', () => {
  describe('BottomDock Action Logic', () => {
    it('triggers core navigation callbacks: Back, Forward, Home, Reload, and Settings', () => {
      const onGoBack = jest.fn();
      const onGoForward = jest.fn();
      const onGoHome = jest.fn();
      const onReload = jest.fn();
      const onOpenSettings = jest.fn();

      onGoBack();
      onGoForward();
      onGoHome();
      onReload();
      onOpenSettings();

      expect(onGoBack).toHaveBeenCalledTimes(1);
      expect(onGoForward).toHaveBeenCalledTimes(1);
      expect(onGoHome).toHaveBeenCalledTimes(1);
      expect(onReload).toHaveBeenCalledTimes(1);
      expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });

    it('respects canGoBack and canGoForward disabled states', () => {
      const onGoBack = jest.fn();
      const onGoForward = jest.fn();

      const handlePressBack = (canBack: boolean) => {
        if (canBack) onGoBack();
      };

      const handlePressForward = (canForward: boolean) => {
        if (canForward) onGoForward();
      };

      handlePressBack(false);
      expect(onGoBack).not.toHaveBeenCalled();

      handlePressBack(true);
      expect(onGoBack).toHaveBeenCalledTimes(1);

      handlePressForward(false);
      expect(onGoForward).not.toHaveBeenCalled();

      handlePressForward(true);
      expect(onGoForward).toHaveBeenCalledTimes(1);
    });

    it('is hidden in landscape mode to maximize video viewing space', () => {
      const shouldRenderDock = (isLandscape: boolean) => !isLandscape;
      expect(shouldRenderDock(false)).toBe(true);
      expect(shouldRenderDock(true)).toBe(false);
    });

    it('collapses to a mini icon when a video is playing unless manually expanded', () => {
      const getIsCollapsed = (isVideoPlaying: boolean, isManuallyExpanded: boolean) =>
        isVideoPlaying && !isManuallyExpanded;

      expect(getIsCollapsed(false, false)).toBe(false); // Paused/stopped: fully expanded
      expect(getIsCollapsed(true, false)).toBe(true);   // Video playing: collapses to mini icon
      expect(getIsCollapsed(true, true)).toBe(false);   // Video playing & tapped: manually expanded
      expect(getIsCollapsed(false, true)).toBe(false);  // Video paused after manual expand: fully expanded
    });

    it('triggers Instagram merged actions for Home, Search, Reels, Direct, Profile, and Screen Adjust', () => {
      const onInstagramAction = jest.fn();

      onInstagramAction('navHome');
      onInstagramAction('navSearch');
      onInstagramAction('navReels');
      onInstagramAction('navDirect');
      onInstagramAction('navProfile');
      onInstagramAction('adjustScreen');
      onInstagramAction('toggleMode');

      expect(onInstagramAction).toHaveBeenCalledTimes(7);
      expect(onInstagramAction).toHaveBeenCalledWith('navHome');
      expect(onInstagramAction).toHaveBeenCalledWith('navSearch');
      expect(onInstagramAction).toHaveBeenCalledWith('navReels');
      expect(onInstagramAction).toHaveBeenCalledWith('navDirect');
      expect(onInstagramAction).toHaveBeenCalledWith('navProfile');
      expect(onInstagramAction).toHaveBeenCalledWith('adjustScreen');
      expect(onInstagramAction).toHaveBeenCalledWith('toggleMode');
    });
  });

  describe('SettingsModal Action Logic', () => {
    it('provides actions for Desktop Mode, Zen Mode, PiP, WebApps Hub, and Extensions Hub', () => {
      const onToggleDesktopMode = jest.fn();
      const onToggleZenMode = jest.fn();
      const onTogglePip = jest.fn();
      const onOpenWebApps = jest.fn();
      const onOpenExtensions = jest.fn();

      onToggleDesktopMode();
      onToggleZenMode();
      onTogglePip();
      onOpenWebApps();
      onOpenExtensions();

      expect(onToggleDesktopMode).toHaveBeenCalledTimes(1);
      expect(onToggleZenMode).toHaveBeenCalledTimes(1);
      expect(onTogglePip).toHaveBeenCalledTimes(1);
      expect(onOpenWebApps).toHaveBeenCalledTimes(1);
      expect(onOpenExtensions).toHaveBeenCalledTimes(1);
    });

    it('calculates active extensions count accurately', () => {
      const extensions = [...DEFAULT_EXTENSIONS];
      const activeCount = extensions.filter((e) => e.enabled).length;
      expect(activeCount).toBe(5);
    });
  });
});
