import React from 'react';
import { View, StyleSheet, Text, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useExtensions } from '../context/ExtensionContext';
import { NeumorphicButton } from './neumorphic/NeumorphicButton';

interface TopHeaderProps {
  isLoading: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onGoHome: () => void;
  onOpenExtensions: () => void;
  onToggleTheme?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  isLoading,
  onGoBack,
  onGoForward,
  onReload,
  onGoHome,
  onOpenExtensions,
  onToggleTheme,
}) => {
  const { palette, isDark, toggleTheme } = useTheme();
  const { stats, extensions } = useExtensions();

  const adBlockerExt = extensions.find((e) => e.id === 'youtube-adblocker');
  const isAdBlockerActive = adBlockerExt?.enabled ?? false;

  return (
    <View style={[styles.headerContainer, { backgroundColor: palette.surface }]}>
      <View style={styles.topRow}>
        {/* Left Navigation Buttons: Back, Forward, Reload */}
        <View style={styles.navButtonsGroup}>
          <NeumorphicButton
            onPress={onGoBack}
            size="sm"
            style={styles.circleBtn}
            icon={
              <Ionicons
                name="chevron-back"
                size={20}
                color={palette.textPrimary}
              />
            }
          />

          <NeumorphicButton
            onPress={onGoForward}
            size="sm"
            style={styles.circleBtn}
            icon={
              <Ionicons
                name="chevron-forward"
                size={20}
                color={palette.textPrimary}
              />
            }
          />

          <NeumorphicButton
            onPress={onReload}
            size="sm"
            style={styles.circleBtn}
            icon={
              <Ionicons
                name={isLoading ? 'close' : 'reload'}
                size={18}
                color={palette.textPrimary}
              />
            }
          />
        </View>

        {/* Center Logo / Home Shortcut */}
        <Pressable
          onPress={onGoHome}
          style={styles.brandContainer}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={[styles.brandIconWrapper, { backgroundColor: palette.primary }]}>
            <Ionicons name="play" size={13} color="#FFF" style={{ marginLeft: 2 }} />
          </View>
          <Text style={[styles.brandText, { color: palette.textPrimary }]}>
            YT<Text style={{ color: palette.primary }}>_wr</Text>
          </Text>
        </Pressable>

        {/* Right Actions: Shield Badge & Theme Switcher */}
        <View style={styles.actionButtonsGroup}>
          <NeumorphicButton
            onPress={onOpenExtensions}
            size="sm"
            style={styles.shieldButton}
            isActive={isAdBlockerActive}
            icon={
              <Ionicons
                name={isAdBlockerActive ? 'shield-checkmark' : 'shield-outline'}
                size={18}
                color={isAdBlockerActive ? palette.success : palette.textMuted}
              />
            }
            title={stats.adsBlocked > 0 ? `${stats.adsBlocked}` : undefined}
          />

          <NeumorphicButton
            onPress={onToggleTheme || toggleTheme}
            size="sm"
            style={styles.circleBtn}
            icon={
              <Ionicons
                name={isDark ? 'sunny' : 'moon'}
                size={18}
                color={isDark ? '#F59E0B' : palette.textPrimary}
              />
            }
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? 10 : 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  navButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  brandIconWrapper: {
    width: 22,
    height: 18,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  brandText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  actionButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shieldButton: {
    height: 38,
    minWidth: 38,
    borderRadius: 19,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
