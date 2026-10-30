import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  LayoutAnimation,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { NeumorphicBox } from './neumorphic/NeumorphicBox';
import { NeumorphicButton } from './neumorphic/NeumorphicButton';
import { triggerHaptic } from '../utils/haptics';

interface BottomDockProps {
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onGoHome: () => void;
  onOpenSettings: () => void;
  isVideoPlaying?: boolean;
  onOpenSearch?: () => void;
  onOpenProfile?: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  canGoBack,
  canGoForward,
  isLoading,
  onGoBack,
  onGoForward,
  onReload,
  onGoHome,
  onOpenSettings,
  isVideoPlaying = false,
  onOpenSearch,
  onOpenProfile,
}) => {
  const { palette } = useTheme();
  const [isManuallyClosed, setIsManuallyClosed] = useState(false);
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);

  // During active video playback or when user manually closes it, collapse dock to mini pill
  const isCollapsed = isManuallyClosed || (isVideoPlaying && !isManuallyExpanded);

  const prevPlayingRef = useRef(isVideoPlaying);
  useEffect(() => {
    if (prevPlayingRef.current !== isVideoPlaying) {
      prevPlayingRef.current = isVideoPlaying;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [isVideoPlaying]);

  // If manually expanded while video is playing, auto-collapse after 5s of inactivity
  useEffect(() => {
    if (isVideoPlaying && isManuallyExpanded) {
      const timer = setTimeout(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsManuallyExpanded(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVideoPlaying, isManuallyExpanded]);

  // Animated spin for reload button when isLoading is active
  const [spinAnim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (isLoading) {
      spinAnim.setValue(0);
      const loop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    } else {
      spinAnim.stopAnimation();
      Animated.timing(spinAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleOpen = () => {
    triggerHaptic();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsManuallyClosed(false);
    setIsManuallyExpanded(true);
  };

  const handleClose = () => {
    triggerHaptic();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsManuallyClosed(true);
    setIsManuallyExpanded(false);
  };

  if (isCollapsed) {
    return (
      <View style={styles.outerContainer} pointerEvents="box-none">
        <NeumorphicBox
          depth="high"
          borderRadius={26}
          style={[styles.miniDockBox, { backgroundColor: palette.surface }]}
        >
          <NeumorphicButton
            onPress={handleOpen}
            size="sm"
            style={styles.miniDockButton}
            borderRadius={22}
            accessibilityLabel="Expand dock"
            icon={
              <Ionicons
                name="chevron-up"
                size={22}
                color={palette.primary}
              />
            }
          />
        </NeumorphicBox>
      </View>
    );
  }

  // Standard Media Navigation Dock
  return (
    <View style={styles.outerContainer} pointerEvents="box-none">
      <NeumorphicBox
        depth="high"
        borderRadius={32}
        style={[
          styles.dockBox,
          { backgroundColor: palette.surface },
          isVideoPlaying && styles.dockBoxWithCollapse,
        ]}
      >
        <View style={styles.dockRow}>
          {/* 1. Back Button */}
          <NeumorphicButton
            onPress={() => {
              if (canGoBack) {
                triggerHaptic();
                onGoBack();
              }
            }}
            size="sm"
            style={[styles.dockItem, !canGoBack && styles.disabledItem]}
            borderRadius={21}
            accessibilityLabel="Go back"
            icon={
              <Ionicons
                name="chevron-back"
                size={22}
                color={canGoBack ? palette.textPrimary : palette.textMuted}
              />
            }
          />

          {/* 2. Forward Button */}
          <NeumorphicButton
            onPress={() => {
              if (canGoForward) {
                triggerHaptic();
                onGoForward();
              }
            }}
            size="sm"
            style={[styles.dockItem, !canGoForward && styles.disabledItem]}
            borderRadius={21}
            accessibilityLabel="Go forward"
            icon={
              <Ionicons
                name="chevron-forward"
                size={22}
                color={canGoForward ? palette.textPrimary : palette.textMuted}
              />
            }
          />

          {/* 3. Center Home Feed Button */}
          <NeumorphicButton
            onPress={() => {
              triggerHaptic();
              onGoHome();
            }}
            size="md"
            style={styles.homeItem}
            borderRadius={24}
            accessibilityLabel="Home feed"
            icon={
              <Ionicons
                name="home"
                size={22}
                color={palette.primary}
              />
            }
          />

          {/* 4. Search Button */}
          {onOpenSearch && (
            <NeumorphicButton
              onPress={() => {
                triggerHaptic();
                onOpenSearch();
              }}
              size="sm"
              style={styles.dockItem}
              borderRadius={21}
              accessibilityLabel="Search"
              icon={
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={palette.textPrimary}
                />
              }
            />
          )}

          {/* 5. Profile Button */}
          {onOpenProfile && (
            <NeumorphicButton
              onPress={() => {
                triggerHaptic();
                onOpenProfile();
              }}
              size="sm"
              style={styles.dockItem}
              borderRadius={21}
              accessibilityLabel="Profile"
              icon={
                <Ionicons
                  name="person-circle-outline"
                  size={22}
                  color={palette.primary}
                />
              }
            />
          )}

          {/* 6. Reload / Refresh Button */}
          <NeumorphicButton
            onPress={() => {
              if (isLoading) return;
              triggerHaptic();
              onReload();
            }}
            size="sm"
            style={[styles.dockItem, isLoading && { opacity: 0.85 }]}
            borderRadius={21}
            accessibilityLabel="Reload page"
            icon={
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons
                  name="reload"
                  size={20}
                  color={isLoading ? palette.primary : palette.textPrimary}
                />
              </Animated.View>
            }
          />

          {/* 7. Settings Button */}
          <NeumorphicButton
            onPress={() => {
              triggerHaptic();
              onOpenSettings();
            }}
            size="sm"
            style={styles.dockItem}
            borderRadius={21}
            accessibilityLabel="Open settings"
            icon={
              <Ionicons
                name="settings-outline"
                size={21}
                color={palette.textPrimary}
              />
            }
          />

          {/* 8. Minimize / Close Dock Button */}
          <NeumorphicButton
            onPress={handleClose}
            size="sm"
            style={styles.closeItem}
            borderRadius={21}
            accessibilityLabel="Minimize dock"
            icon={
              <Ionicons
                name="chevron-down"
                size={20}
                color={palette.textMuted}
              />
            }
          />
        </View>
      </NeumorphicBox>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  miniDockBox: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 26,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniDockButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  dockBox: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 32,
    minWidth: 280,
    maxWidth: 395,
  },
  dockBoxWithCollapse: {
    minWidth: 280,
    maxWidth: 395,
  },
  dockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  dockItem: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  homeItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  closeItem: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  disabledItem: {
    opacity: 0.38,
  },
});
