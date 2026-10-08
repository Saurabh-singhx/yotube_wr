import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, LayoutAnimation, UIManager, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { NeumorphicBox } from './neumorphic/NeumorphicBox';
import { NeumorphicButton } from './neumorphic/NeumorphicButton';
import { triggerHaptic } from '../utils/haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  isInstagram?: boolean;
  onInstagramAction?: (action: string) => void;
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
  isInstagram = false,
  onInstagramAction,
}) => {
  const { palette } = useTheme();
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);
  const [isInstagramManuallyCollapsed, setIsInstagramManuallyCollapsed] = useState(false);

  // On Instagram, show dock by default since Instagram web bottom tabs are replaced by this dock.
  // During YouTube video playback, default to collapsed unless manually expanded.
  const isCollapsed = isInstagram
    ? isInstagramManuallyCollapsed
    : (isVideoPlaying && !isManuallyExpanded);

  const prevPlayingRef = useRef(isVideoPlaying);
  useEffect(() => {
    if (prevPlayingRef.current !== isVideoPlaying) {
      prevPlayingRef.current = isVideoPlaying;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [isVideoPlaying]);

  // If manually expanded while YouTube video is playing, auto-collapse after 5s of inactivity
  useEffect(() => {
    if (!isInstagram && isVideoPlaying && isManuallyExpanded) {
      const timer = setTimeout(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsManuallyExpanded(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVideoPlaying, isInstagram, isManuallyExpanded]);

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

  const handleExpand = () => {
    triggerHaptic();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isInstagram) {
      setIsInstagramManuallyCollapsed(false);
    } else {
      setIsManuallyExpanded(true);
    }
  };

  const handleCollapse = () => {
    triggerHaptic();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isInstagram) {
      setIsInstagramManuallyCollapsed(true);
    } else {
      setIsManuallyExpanded(false);
    }
  };

  if (isCollapsed) {
    return (
      <View
        style={isInstagram ? styles.instagramMiniOuterContainer : styles.outerContainer}
        pointerEvents="box-none"
      >
        <NeumorphicBox
          depth="high"
          borderRadius={26}
          style={[styles.miniDockBox, { backgroundColor: palette.surface }]}
        >
          <NeumorphicButton
            onPress={handleExpand}
            size="sm"
            style={styles.miniDockButton}
            borderRadius={22}
            icon={
              <Ionicons
                name={isInstagram ? 'logo-instagram' : 'chevron-up'}
                size={isInstagram ? 22 : 22}
                color={isInstagram ? '#E1306C' : palette.primary}
              />
            }
          />
        </NeumorphicBox>
      </View>
    );
  }

  // 1. Dedicated Instagram Navigation Dock (Replaces in-page Instagram tabs with clean app buttons)
  if (isInstagram) {
    return (
      <View style={styles.outerContainer} pointerEvents="box-none">
        <NeumorphicBox
          depth="high"
          borderRadius={30}
          style={[styles.instagramDockBox, { backgroundColor: palette.surface }]}
        >
          <View style={styles.instagramDockRow}>
            {/* 1. Home Feed */}
            <NeumorphicButton
              onPress={() => {
                triggerHaptic();
                onInstagramAction?.('navHome');
              }}
              size="sm"
              style={styles.igDockItem}
              borderRadius={19}
              icon={<Ionicons name="home-outline" size={20} color={palette.textPrimary} />}
            />

            {/* 2. Explore / Search */}
            <NeumorphicButton
              onPress={() => {
                triggerHaptic();
                onInstagramAction?.('navSearch');
              }}
              size="sm"
              style={styles.igDockItem}
              borderRadius={19}
              icon={<Ionicons name="search-outline" size={20} color={palette.textPrimary} />}
            />

            {/* 3. Reels Tab (Highlighted) */}
            <NeumorphicButton
              onPress={() => {
                triggerHaptic();
                onInstagramAction?.('navReels');
              }}
              size="sm"
              style={[styles.igDockItem, styles.igReelsActiveItem]}
              borderRadius={19}
              icon={<Ionicons name="film" size={20} color="#E1306C" />}
            />

            {/* 4. Direct / Share Messages */}
            <NeumorphicButton
              onPress={() => {
                triggerHaptic();
                onInstagramAction?.('navDirect');
              }}
              size="sm"
              style={styles.igDockItem}
              borderRadius={19}
              icon={<Ionicons name="paper-plane-outline" size={19} color={palette.textPrimary} />}
            />

            {/* 5. My Profile */}
            <NeumorphicButton
              onPress={() => {
                triggerHaptic();
                onInstagramAction?.('navProfile');
              }}
              size="sm"
              style={styles.igDockItem}
              borderRadius={19}
              icon={<Ionicons name="person-outline" size={20} color={palette.textPrimary} />}
            />

            {/* 6. Screen Adjust (Two-Finger / Fit vs Fill Toggle) */}
            <NeumorphicButton
              onPress={() => {
                triggerHaptic();
                onInstagramAction?.('adjustScreen');
              }}
              size="sm"
              style={styles.igDockItem}
              borderRadius={19}
              icon={<Ionicons name="scan-outline" size={19} color={palette.accent} />}
            />

            {/* 7. Switch Back to YouTube */}
            <NeumorphicButton
              onPress={() => {
                triggerHaptic();
                onGoHome();
              }}
              size="sm"
              style={styles.igDockItem}
              borderRadius={19}
              icon={<Ionicons name="logo-youtube" size={20} color="#FF0000" />}
            />

            {/* 8. Collapse Dock */}
            <NeumorphicButton
              onPress={handleCollapse}
              size="sm"
              style={styles.igCollapseItem}
              borderRadius={17}
              icon={<Ionicons name="chevron-down" size={18} color={palette.textMuted} />}
            />
          </View>
        </NeumorphicBox>
      </View>
    );
  }

  // 2. Standard YouTube Navigation Dock
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
            borderRadius={23}
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
            borderRadius={23}
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
            borderRadius={26}
            icon={
              <Ionicons
                name="home"
                size={22}
                color={palette.primary}
              />
            }
          />

          {/* 4. Reload / Refresh Button */}
          <NeumorphicButton
            onPress={() => {
              if (isLoading) return;
              triggerHaptic();
              onReload();
            }}
            size="sm"
            style={[styles.dockItem, isLoading && { opacity: 0.85 }]}
            borderRadius={23}
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

          {/* 5. Settings Button */}
          <NeumorphicButton
            onPress={() => {
              triggerHaptic();
              onOpenSettings();
            }}
            size="sm"
            style={styles.dockItem}
            borderRadius={23}
            icon={
              <Ionicons
                name="settings-outline"
                size={21}
                color={palette.textPrimary}
              />
            }
          />

          {/* 6. Collapse Button (shown when manually expanded during playback) */}
          {isVideoPlaying && isManuallyExpanded && (
            <NeumorphicButton
              onPress={handleCollapse}
              size="sm"
              style={styles.collapseItem}
              borderRadius={21}
              icon={
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={palette.primary}
                />
              }
            />
          )}
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
  instagramMiniOuterContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 20,
    right: 14,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 32,
    minWidth: 310,
    maxWidth: 360,
  },
  dockBoxWithCollapse: {
    minWidth: 340,
    maxWidth: 410,
  },
  dockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  dockItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  homeItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  collapseItem: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  disabledItem: {
    opacity: 0.38,
  },
  // Instagram App Dock Styles
  instagramDockBox: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 30,
    minWidth: 335,
    maxWidth: 375,
  },
  instagramDockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  igDockItem: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  igReelsActiveItem: {
    borderWidth: 1.5,
    borderColor: '#E1306C',
  },
  igCollapseItem: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
});
