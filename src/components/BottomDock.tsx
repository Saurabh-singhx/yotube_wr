import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useExtensions } from '../context/ExtensionContext';
import { NeumorphicBox } from './neumorphic/NeumorphicBox';
import { NeumorphicButton } from './neumorphic/NeumorphicButton';

interface BottomDockProps {
  currentSpeed: number;
  isDesktopMode: boolean;
  onGoHome: () => void;
  onOpenPlayback: () => void;
  onOpenExtensions: () => void;
  onToggleZenMode: () => void;
  onToggleDesktopMode: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  currentSpeed,
  isDesktopMode,
  onGoHome,
  onOpenPlayback,
  onOpenExtensions,
  onToggleZenMode,
  onToggleDesktopMode,
}) => {
  const { palette } = useTheme();
  const { extensions } = useExtensions();

  const zenExt = extensions.find((e) => e.id === 'youtube-distraction-free');
  const isZenActive = zenExt?.enabled ?? false;

  const activeExtensionsCount = extensions.filter((e) => e.enabled).length;

  return (
    <View style={styles.outerContainer} pointerEvents="box-none">
      <NeumorphicBox
        depth="high"
        borderRadius={28}
        style={[styles.dockBox, { backgroundColor: palette.surfaceElevated }]}
      >
        <View style={styles.dockRow}>
          {/* Home */}
          <NeumorphicButton
            onPress={onGoHome}
            size="sm"
            style={styles.dockItem}
            icon={<Ionicons name="home" size={20} color={palette.textPrimary} />}
          />

          {/* Audio & Speed Booster Modal */}
          <NeumorphicButton
            onPress={onOpenPlayback}
            size="sm"
            style={[styles.dockItem, currentSpeed !== 1.0 && styles.activeItem]}
            isActive={currentSpeed !== 1.0}
            icon={
              <Ionicons
                name="speedometer"
                size={18}
                color={currentSpeed !== 1.0 ? palette.accent : palette.textPrimary}
              />
            }
            title={`${currentSpeed}x`}
          />

          {/* Zen Distraction-Free Toggle */}
          <NeumorphicButton
            onPress={onToggleZenMode}
            size="sm"
            style={[styles.dockItem, isZenActive && styles.activeItem]}
            isActive={isZenActive}
            icon={
              <Ionicons
                name="leaf"
                size={18}
                color={isZenActive ? palette.success : palette.textPrimary}
              />
            }
          />

          {/* Desktop / Mobile Switch */}
          <NeumorphicButton
            onPress={onToggleDesktopMode}
            size="sm"
            style={[styles.dockItem, isDesktopMode && styles.activeItem]}
            isActive={isDesktopMode}
            icon={
              <Ionicons
                name={isDesktopMode ? 'desktop' : 'phone-portrait-outline'}
                size={18}
                color={isDesktopMode ? palette.accent : palette.textPrimary}
              />
            }
          />

          {/* Extension Manager */}
          <NeumorphicButton
            onPress={onOpenExtensions}
            size="sm"
            style={styles.dockItem}
            icon={<Ionicons name="extension-puzzle" size={19} color={palette.accent} />}
            badge={activeExtensionsCount}
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
    left: 16,
    right: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 28,
  },
  dockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dockItem: {
    minWidth: 42,
    minHeight: 42,
    borderRadius: 21,
    paddingHorizontal: 10,
  },
  activeItem: {
    borderWidth: 1.5,
  },
});
