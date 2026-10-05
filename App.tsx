import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  BackHandler,
  Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ExtensionProvider, useExtensions } from './src/context/ExtensionContext';
import { ExtensionEngine } from './src/core/ExtensionEngine';
import { TopHeader } from './src/components/TopHeader';
import { BottomDock } from './src/components/BottomDock';
import { ExtensionsModal } from './src/components/ExtensionsModal';
import { CustomExtensionModal } from './src/components/CustomExtensionModal';
import { SearchModal } from './src/components/SearchModal';
import { PipPlayer } from './src/components/PipPlayer';
import { triggerHaptic } from './src/utils/haptics';

const MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function MainApp() {
  const { palette, isDark, toggleTheme } = useTheme();
  const { extensions, handleBridgeMessage, toggleExtension } = useExtensions();

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

  // Picture-in-Picture (PiP) State
  const [pipVideoId, setPipVideoId] = useState<string | null>(null);
  const lastVideoIdRef = useRef<string | null>(null);

  // Modals
  const [isExtensionsModalOpen, setIsExtensionsModalOpen] = useState(false);
  const [isCustomExtensionModalOpen, setIsCustomExtensionModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Stable WebView source that only changes when user explicitly switches webapp or desktop mode
  const webViewSource = useMemo(() => {
    return { uri: activeSourceUri };
  }, [activeSourceUri]);

  // Compile extension scripts (only recomputed when extensions or dark theme change)
  const injectedStartScript = useMemo(() => {
    return ExtensionEngine.buildBeforeContentLoadedScript(extensions, 'https://m.youtube.com', isDark);
  }, [extensions, isDark]);

  const injectedEndScript = useMemo(() => {
    return ExtensionEngine.buildAfterContentLoadedScript(extensions, 'https://m.youtube.com', isDark);
  }, [extensions, isDark]);

  // Extract YouTube Video ID
  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    const watchMatch = url.match(/[?&]v=([^&#]+)/);
    if (watchMatch) return watchMatch[1];
    const shortsMatch = url.match(/\/shorts\/([^&#/?]+)/);
    if (shortsMatch) return shortsMatch[1];
    const embedMatch = url.match(/\/embed\/([^&#/?]+)/);
    if (embedMatch) return embedMatch[1];
    return null;
  };

  // Handle hardware back button on Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => {
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
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [canGoBack, isSearchModalOpen, isExtensionsModalOpen, isCustomExtensionModalOpen, pipVideoId]);

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
      if (isLoading) {
        webViewRef.current.stopLoading();
      } else {
        webViewRef.current.reload();
      }
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
    toggleExtension('youtube-distraction-free');
    triggerHaptic();
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(
        ExtensionEngine.buildAfterContentLoadedScript(extensions, currentUrl, isDark)
      );
    }
  };

  const handleToggleTheme = () => {
    const nextIsDark = !isDark;
    toggleTheme();
    triggerHaptic();
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(ExtensionEngine.getThemeToggleScript(nextIsDark));
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
      style={[styles.container, { backgroundColor: palette.surface }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Top Navigation Header with Zen Mode & Theme Switcher */}
      <TopHeader
        isLoading={isLoading}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onReload={handleReload}
        onGoHome={handleGoHome}
        onOpenExtensions={() => setIsExtensionsModalOpen(true)}
        onToggleTheme={handleToggleTheme}
        onToggleZenMode={handleToggleZenMode}
      />

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

      {/* Main WebView Container */}
      <View style={[styles.webViewContainer, { backgroundColor: palette.background }]}>
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
          androidLayerType="hardware"
          mixedContentMode="always"
          originWhitelist={['*']}
          style={styles.webView}
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

      {/* Bottom Floating Neumorphic Dock with WebApps Hub and PiP Mode */}
      <BottomDock
        isDesktopMode={isDesktopMode}
        isPipActive={!!pipVideoId}
        onGoHome={handleGoHome}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onTogglePip={handleTogglePip}
        onOpenExtensions={() => setIsExtensionsModalOpen(true)}
        onToggleDesktopMode={handleToggleDesktopMode}
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
    <SafeAreaProvider>
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
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
