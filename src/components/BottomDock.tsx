import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useExtensions } from '../context/ExtensionContext';
import { NeumorphicBox } from './neumorphic/NeumorphicBox';
import { NeumorphicButton } from './neumorphic/NeumorphicButton';

interface BottomDockProps {
  isDesktopMode: boolean;
  isPipActive?: boolean;
  onGoHome: () => void;
  onOpenSearch: () => void;
  onTogglePip?: () => void;
  onOpenExtensions: () => void;
  onToggleDesktopMode: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  isDesktopMode,
  isPipActive = false,
  onGoHome,
  onOpenSearch,
  onTogglePip,
  onOpenExtensions,
  onToggleDesktopMode,
}) => {
  const { palette } = useTheme();
  const { extensions } = useExtensions();

  const activeExtensionsCount = extensions.filter((e) => e.enabled).length;

  return (
    <View style={styles.outerContainer} pointerEvents="box-none">
      <NeumorphicBox
        depth="high"
        borderRadius={32}
        style={styles.dockBox}
      >
        <View style={styles.dockRow}>
          {/* 1. Home Feed */}
          <NeumorphicButton
            onPress={onGoHome}
            size="sm"
            style={styles.dockItem}
            borderRadius={23}
            icon={<Ionicons name="home" size={20} color={palette.textPrimary} />}
          />

          {/* 2. WebApps & Search Hub */}
          <NeumorphicButton
            onPress={onOpenSearch}
            size="sm"
            style={styles.dockItem}
            borderRadius={23}
            icon={<Ionicons name="globe" size={20} color={palette.accent} />}
          />

          {/* 3. Picture-in-Picture (PiP) Mode */}
          {onTogglePip && (
            <NeumorphicButton
              onPress={onTogglePip}
              size="sm"
              style={styles.dockItem}
              borderRadius={23}
              isActive={isPipActive}
              icon={
                <Ionicons
                  name="tv"
                  size={19}
                  color={isPipActive ? palette.primary : palette.textPrimary}
                />
              }
            />
          )}

          {/* 4. Desktop / Mobile Toggle */}
          <NeumorphicButton
            onPress={onToggleDesktopMode}
            size="sm"
            style={styles.dockItem}
            borderRadius={23}
            isActive={isDesktopMode}
            icon={
              <Ionicons
                name={isDesktopMode ? 'desktop' : 'phone-portrait-outline'}
                size={19}
                color={isDesktopMode ? palette.accent : palette.textPrimary}
              />
            }
          />

          {/* 5. Extension Hub */}
          <NeumorphicButton
            onPress={onOpenExtensions}
            size="sm"
            style={styles.dockItem}
            borderRadius={23}
            icon={<Ionicons name="extension-puzzle" size={20} color={palette.textPrimary} />}
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
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockBox: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 32,
    maxWidth: 360,
    width: '100%',
  },
  dockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  dockItem: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
