import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
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
}) => {
  const { palette } = useTheme();

  return (
    <View style={styles.outerContainer} pointerEvents="box-none">
      <NeumorphicBox
        depth="high"
        borderRadius={32}
        style={[styles.dockBox, { backgroundColor: palette.surface }]}
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
              triggerHaptic();
              onReload();
            }}
            size="sm"
            style={styles.dockItem}
            borderRadius={23}
            icon={
              <Ionicons
                name="reload"
                size={20}
                color={palette.textPrimary}
              />
            }
          />

          {/* 5. Settings Button (replaces other webapp selector button) */}
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
  dockBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 32,
    minWidth: 310,
    maxWidth: 360,
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
  disabledItem: {
    opacity: 0.38,
  },
});
