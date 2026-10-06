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
}) => {
  const { palette } = useTheme();
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);

  // If video is playing and user hasn't explicitly tapped to expand, shrink to mini icon
  const isCollapsed = isVideoPlaying && !isManuallyExpanded;

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

  const handleExpand = () => {
    triggerHaptic();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsManuallyExpanded(true);
  };

  const handleCollapse = () => {
    triggerHaptic();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
            onPress={handleExpand}
            size="sm"
            style={styles.miniDockButton}
            borderRadius={22}
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
    maxWidth: 395,
  },
  dockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
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
});
