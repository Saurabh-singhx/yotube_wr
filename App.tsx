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
import { triggerHaptic } from './src/utils/haptics';

const MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function MainApp() {
  const { palette, isDark } = useTheme();
  const { extensions, handleBridgeMessage, toggleExtension } = useExtensions();

  const webViewRef = useRef<WebView>(null);

  const [currentUrl, setCurrentUrl] = useState('https://m.youtube.com');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [isDesktopMode, setIsDesktopMode] = useState(false);

  // Modals
  const [isExtensionsModalOpen, setIsExtensionsModalOpen] = useState(false);
  const [isCustomExtensionModalOpen, setIsCustomExtensionModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Compile extension scripts
  const injectedStartScript = useMemo(() => {
    return ExtensionEngine.buildBeforeContentLoadedScript(extensions, currentUrl);
  }, [extensions, currentUrl]);

  const injectedEndScript = useMemo(() => {
    return ExtensionEngine.buildAfterContentLoadedScript(extensions, currentUrl);
  }, [extensions, currentUrl]);

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
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [canGoBack, isSearchModalOpen, isExtensionsModalOpen, isCustomExtensionModalOpen]);

  const handleNavigate = (url: string) => {
    setCurrentUrl(url);
  };

  const handleGoBack = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
      triggerHaptic();
    }
  };

  const handleGoForward = () => {
    if (canGoForward && webViewRef.current) {
      webViewRef.current.goForward();
      triggerHaptic();
    }
  };

  const handleReload = () => {
    if (webViewRef.current) {
      if (isLoading) {
        webViewRef.current.stopLoading();
      } else {
        webViewRef.current.reload();
      }
      triggerHaptic();
    }
  };

  const handleGoHome = () => {
    setCurrentUrl(isDesktopMode ? 'https://www.youtube.com' : 'https://m.youtube.com');
    triggerHaptic();
  };

  const handleToggleDesktopMode = () => {
    const nextDesktop = !isDesktopMode;
    setIsDesktopMode(nextDesktop);
    triggerHaptic();
    const newUrl = nextDesktop
      ? currentUrl.replace('m.youtube.com', 'www.youtube.com')
      : currentUrl.replace('www.youtube.com', 'm.youtube.com');
    setCurrentUrl(newUrl);
  };

  const handleToggleZenMode = () => {
    toggleExtension('youtube-distraction-free');
    triggerHaptic();
    // Re-inject updated styles immediately
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(
        ExtensionEngine.buildAfterContentLoadedScript(extensions, currentUrl)
      );
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.surface }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Top Navigation Header (Clean, no search bar) */}
      <TopHeader
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        isLoading={isLoading}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onReload={handleReload}
        onGoHome={handleGoHome}
        onOpenExtensions={() => setIsExtensionsModalOpen(true)}
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
          source={{ uri: currentUrl }}
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
            if (navState.url && navState.url !== currentUrl) {
              setCurrentUrl(navState.url);
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
          style={styles.webView}
        />
      </View>

      {/* Bottom Floating Neumorphic Dock with Search icon */}
      <BottomDock
        isDesktopMode={isDesktopMode}
        onGoHome={handleGoHome}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenExtensions={() => setIsExtensionsModalOpen(true)}
        onToggleZenMode={handleToggleZenMode}
        onToggleDesktopMode={handleToggleDesktopMode}
      />

      {/* Search Modal */}
      <SearchModal
        visible={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSearch={handleNavigate}
        currentUrl={currentUrl}
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
