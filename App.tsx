import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  BackHandler,
  Platform,
  useWindowDimensions,
  NativeModules,
  NativeEventEmitter,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ExtensionProvider, useExtensions } from './src/context/ExtensionContext';
import { ExtensionEngine } from './src/core/ExtensionEngine';
import { BottomDock } from './src/components/BottomDock';
import { SettingsModal } from './src/components/SettingsModal';
import { ExtensionsModal } from './src/components/ExtensionsModal';
import { CustomExtensionModal } from './src/components/CustomExtensionModal';
import { SearchModal } from './src/components/SearchModal';
import { PipPlayer } from './src/components/PipPlayer';
import { triggerHaptic } from './src/utils/haptics';
import { extractVideoId } from './src/utils/urlHelper';
import { getZoomRuntimeScript } from './src/utils/zoomScript';
import { getRemoteControlScript } from './src/utils/mediaSessionScript';

const MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function MainApp() {
  const { palette, isDark } = useTheme();
  const { extensions, handleBridgeMessage, toggleExtension } = useExtensions();
  const { width, height } = useWindowDimensions();

  // Screen orientation tracking (horizontal landscape detection)
  const isLandscape = width > height;

  const webViewRef = useRef<WebView>(null);

  // Active top-level URI for the native WebView (updates on deliberate user navigation)
  const [activeSourceUri, setActiveSourceUri] = useState('https://m.youtube.com');

  // Currently loaded URL reported by the page (for UI/search tracking)
  const [currentUrl, setCurrentUrl] = useState('https://m.youtube.com');

  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [isDesktopMode, setIsDesktopMode] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Picture-in-Picture (PiP) State
  const [pipVideoId, setPipVideoId] = useState<string | null>(null);
  const lastVideoIdRef = useRef<string | null>(null);

  // Modals
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExtensionsModalOpen, setIsExtensionsModalOpen] = useState(false);
  const [isCustomExtensionModalOpen, setIsCustomExtensionModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const zenExt = extensions.find((e) => e.id === 'youtube-distraction-free');
  const isZenActive = zenExt?.enabled ?? false;

  // Allow free rotation so the user can easily watch videos in portrait and landscape
  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => {});
  }, []);

  // Media session state tracking for native Android lockscreen and notification
  const mediaMetadataRef = useRef({
    title: '',
    artist: '',
    album: 'YouTube',
    thumbnailUrl: '',
    isPlaying: false,
    position: 0,
    duration: 0,
    speed: 1,
  });

  // Native Android MediaSession lockscreen/notification controls
  useEffect(() => {
    if (Platform.OS !== 'android' || !NativeModules.MediaSessionModule) return;

    if (NativeModules.MediaSessionModule.requestNotificationPermission) {
      NativeModules.MediaSessionModule.requestNotificationPermission().catch(() => {});
    }

    const eventEmitter = new NativeEventEmitter(NativeModules.MediaSessionModule);
    const sub = eventEmitter.addListener(
      'MediaSessionAction',
      (event: { action: string; position?: number }) => {
        if (webViewRef.current) {
          const script = getRemoteControlScript(event.action, event.position);
          webViewRef.current.injectJavaScript(script);
        }
      }
    );

    return () => {
      sub.remove();
      if (NativeModules.MediaSessionModule?.stopPlayback) {
        NativeModules.MediaSessionModule.stopPlayback();
      }
    };
  }, []);

  // Stable WebView source that only changes when user explicitly switches webapp or desktop mode
  const webViewSource = useMemo(() => {
    return { uri: activeSourceUri };
  }, [activeSourceUri]);

  // Compile extension scripts (recomputed when extensions, active webapp source, or dark theme change)
  const injectedStartScript = useMemo(() => {
    return ExtensionEngine.buildBeforeContentLoadedScript(extensions, activeSourceUri, isDark);
  }, [extensions, activeSourceUri, isDark]);

  const injectedEndScript = useMemo(() => {
    const baseScript = ExtensionEngine.buildAfterContentLoadedScript(extensions, activeSourceUri, isDark);
    const zoomScript = getZoomRuntimeScript();
    return `${baseScript}\n${zoomScript}`;
  }, [extensions, activeSourceUri, isDark]);

  // Fullscreen tracking for in-page YouTube player
  const [isWebFullscreen, setIsWebFullscreen] = useState(false);

  // Handle hardware back button on Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => {
        if (isSettingsModalOpen) {
          setIsSettingsModalOpen(false);
          return true;
        }
        if (isSearchModalOpen) {
          setIsSearchModalOpen(false);
          return true;
        }
        if (isExtensionsModalOpen) {
          setIsExtensionsModalOpen(false);
          return true;
        }
        if (isCustomExtensionModalOpen) {
          setIsCustomExtensionModalOpen(false);
          return true;
        }
        if (pipVideoId) {
          setPipVideoId(null);
          return true;
        }
        // If in fullscreen video, exit fullscreen cleanly without navigating back!
        if (isWebFullscreen && webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            (function() {
              var exitBtn = document.querySelector('.ytp-fullscreen-button, button[aria-label*="Exit full screen" i]');
              if (exitBtn) {
                exitBtn.click();
              } else if (document.exitFullscreen) {
                document.exitFullscreen();
              } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
              }
            })();
            true;
          `);
          setIsWebFullscreen(false);
          return true;
        }
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [
    canGoBack,
    isWebFullscreen,
    isSettingsModalOpen,
    isSearchModalOpen,
    isExtensionsModalOpen,
    isCustomExtensionModalOpen,
    pipVideoId,
  ]);

  const handleNavigate = (url: string) => {
    triggerHaptic();

    // If navigating to another webapp (e.g. Instagram) while a video was playing:
    // Automatically pop the video into floating PiP mode so it keeps playing!
    const activeVid = extractVideoId(currentUrl) || lastVideoIdRef.current;
    const isOtherWebapp = !url.includes('youtube.com');
    if (isOtherWebapp && activeVid && !pipVideoId) {
      setPipVideoId(activeVid);
    }

    setCurrentUrl(url);
    setActiveSourceUri(url);
  };

  const handleGoBack = () => {
    triggerHaptic();
    if (webViewRef.current) {
      webViewRef.current.goBack();
      webViewRef.current.injectJavaScript('window.history.back(); true;');
    }
  };

  const handleGoForward = () => {
    triggerHaptic();
    if (webViewRef.current) {
      webViewRef.current.goForward();
      webViewRef.current.injectJavaScript('window.history.forward(); true;');
    }
  };

  const handleReload = () => {
    triggerHaptic();
    if (webViewRef.current) {
      webViewRef.current.reload();
      webViewRef.current.injectJavaScript('window.location.reload(); true;');
    }
  };

  const handleGoHome = () => {
    triggerHaptic();
    const targetUrl = isDesktopMode ? 'https://www.youtube.com' : 'https://m.youtube.com';
    setCurrentUrl(targetUrl);
    setActiveSourceUri(targetUrl);
  };

  const handleToggleDesktopMode = () => {
    const nextDesktop = !isDesktopMode;
    setIsDesktopMode(nextDesktop);
    triggerHaptic();
    const newUrl = nextDesktop
      ? currentUrl.replace('m.youtube.com', 'www.youtube.com')
      : currentUrl.replace('www.youtube.com', 'm.youtube.com');
    setCurrentUrl(newUrl);
    setActiveSourceUri(newUrl);
  };

  const handleToggleZenMode = () => {
    const updatedExtensions = extensions.map((ext) =>
      ext.id === 'youtube-distraction-free' ? { ...ext, enabled: !ext.enabled } : ext
    );
    toggleExtension('youtube-distraction-free');
    triggerHaptic();
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(
        ExtensionEngine.buildAfterContentLoadedScript(updatedExtensions, currentUrl, isDark)
      );
    }
  };

  const handleTogglePip = () => {
    triggerHaptic();
    if (pipVideoId) {
      setPipVideoId(null);
      return;
    }
    const vidId = extractVideoId(currentUrl) || lastVideoIdRef.current;
    if (vidId) {
      setPipVideoId(vidId);
    } else {
      setIsSearchModalOpen(true);
    }
  };

  const handleExpandPip = () => {
    if (pipVideoId) {
      const watchUrl = `https://m.youtube.com/watch?v=${pipVideoId}`;
      setPipVideoId(null);
      handleNavigate(watchUrl);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: palette.surface },
      ]}
      edges={isLandscape ? [] : ['top', 'left', 'right']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Loading Progress Bar */}
      {isLoading && progress < 1 && (
        <View
          style={[
            styles.progressBarContainer,
            { backgroundColor: palette.surfacePressed },
          ]}
        >
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: palette.accent,
              },
            ]}
          />
        </View>
      )}

      {/* Main WebView Container: Takes 100% full screen width and height */}
      <View
        style={[
          styles.webViewContainer,
          { backgroundColor: palette.background },
        ]}
      >
        <WebView
          ref={webViewRef}
          source={webViewSource}
          userAgent={isDesktopMode ? DESKTOP_USER_AGENT : MOBILE_USER_AGENT}
          injectedJavaScriptBeforeContentLoaded={injectedStartScript}
          injectedJavaScript={injectedEndScript}
          onMessage={(event) => {
            const rawData = event.nativeEvent.data;
            const msg = ExtensionEngine.parseBridgeMessage(rawData);
            if (msg) {
              if (msg.extensionId === 'youtube-fullscreen' && msg.type === 'FULLSCREEN_CHANGE') {
                setIsWebFullscreen(Boolean(msg.payload?.isFullscreen));
                return;
              }
              if (msg.extensionId === 'media-session') {
                const p = (msg.payload || {}) as Record<string, unknown>;
                if (typeof p.title === 'string' && p.title) mediaMetadataRef.current.title = p.title;
                if (typeof p.artist === 'string' && p.artist) mediaMetadataRef.current.artist = p.artist;
                if (typeof p.album === 'string' && p.album) mediaMetadataRef.current.album = p.album;
                if (typeof p.thumbnailUrl === 'string' && p.thumbnailUrl) mediaMetadataRef.current.thumbnailUrl = p.thumbnailUrl;
                if (typeof p.isPlaying === 'boolean') {
                  mediaMetadataRef.current.isPlaying = p.isPlaying;
                  setIsVideoPlaying(p.isPlaying);
                }
                if (typeof p.position === 'number') mediaMetadataRef.current.position = p.position;
                if (typeof p.duration === 'number') mediaMetadataRef.current.duration = p.duration;
                if (typeof p.speed === 'number') mediaMetadataRef.current.speed = p.speed;

                if (Platform.OS === 'android' && NativeModules.MediaSessionModule?.updatePlayback) {
                  NativeModules.MediaSessionModule.updatePlayback(mediaMetadataRef.current);
                }
                return;
              }
              handleBridgeMessage(msg);
            }
          }}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
            setCanGoForward(navState.canGoForward);
            if (navState.url) {
              setCurrentUrl(navState.url);
              const vid = extractVideoId(navState.url);
              if (vid) {
                lastVideoIdRef.current = vid;
              } else {
                setIsVideoPlaying(false);
              }
            }
          }}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
          allowsFullscreenVideo={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          cacheEnabled={true}
          setSupportMultipleWindows={false}
          textZoom={100}
          scalesPageToFit={false}
          androidLayerType="hardware"
          mixedContentMode="always"
          originWhitelist={['*']}
          style={[styles.webView, { backgroundColor: palette.background }]}
        />
      </View>

      {/* Floating Picture-in-Picture Miniplayer */}
      {pipVideoId && (
        <PipPlayer
          videoId={pipVideoId}
          onClose={() => setPipVideoId(null)}
          onExpand={handleExpandPip}
        />
      )}

      {/* Bottom Floating Navigation Dock: Back, Forward, Home, Reload, Settings */}
      {!isLandscape && !isWebFullscreen && (
        <BottomDock
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          isLoading={isLoading}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
          onReload={handleReload}
          onGoHome={handleGoHome}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          isVideoPlaying={isVideoPlaying}
        />
      )}

      {/* Settings Modal (Desktop mode, Zen mode, Theme, PiP, WebApps Hub, Extensions Hub) */}
      <SettingsModal
        visible={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        isDesktopMode={isDesktopMode}
        onToggleDesktopMode={handleToggleDesktopMode}
        isZenActive={isZenActive}
        onToggleZenMode={handleToggleZenMode}
        isPipActive={!!pipVideoId}
        onTogglePip={handleTogglePip}
        onOpenExtensions={() => setIsExtensionsModalOpen(true)}
        onOpenWebApps={() => setIsSearchModalOpen(true)}
      />

      {/* WebApps & Browser Hub Modal */}
      <SearchModal
        visible={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onNavigate={handleNavigate}
        currentUrl={currentUrl}
        hasActiveVideo={!!(extractVideoId(currentUrl) || lastVideoIdRef.current)}
      />

      {/* Extensions Hub Modal */}
      <ExtensionsModal
        visible={isExtensionsModalOpen}
        onClose={() => setIsExtensionsModalOpen(false)}
        onOpenCreateCustom={() => {
          setIsExtensionsModalOpen(false);
          setIsCustomExtensionModalOpen(true);
        }}
      />

      {/* Custom Extension Builder Modal */}
      <CustomExtensionModal
        visible={isCustomExtensionModalOpen}
        onClose={() => setIsCustomExtensionModalOpen(false)}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <ExtensionProvider>
          <MainApp />
        </ExtensionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressBarContainer: {
    height: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  webViewContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  webView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
