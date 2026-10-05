import React from 'react';
import { View, StyleSheet, Text, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useExtensions } from '../context/ExtensionContext';
import { NeumorphicButton } from './neumorphic/NeumorphicButton';

interface TopHeaderProps {
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onGoHome: () => void;
  onOpenExtensions: () => void;
  onToggleTheme?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  canGoBack,
  canGoForward,
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
        {/* Navigation buttons: Back, Forward, Reload */}
        <View style={styles.navButtonsGroup}>
          <NeumorphicButton
            onPress={onGoBack}
            disabled={!canGoBack}
            size="sm"
            style={styles.circleBtn}
            icon={
              <Ionicons
                name="chevron-back"
                size={18}
                color={canGoBack ? palette.textPrimary : palette.textMuted}
              />
            }
          />

          <NeumorphicButton
            onPress={onGoForward}
            disabled={!canGoForward}
            size="sm"
            style={styles.circleBtn}
            icon={
              <Ionicons
                name="chevron-forward"
                size={18}
                color={canGoForward ? palette.textPrimary : palette.textMuted}
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
                size={16}
                color={palette.textPrimary}
              />
            }
          />
        </View>

        {/* Center Brand / Logo */}
        <Pressable onPress={onGoHome} style={styles.brandContainer}>
          <View style={[styles.brandIconWrapper, { backgroundColor: palette.primary }]}>
            <Ionicons name="play" size={14} color="#FFF" style={{ marginLeft: 2 }} />
          </View>
          <Text style={[styles.brandText, { color: palette.textPrimary }]}>
            YT<Text style={{ color: palette.primary }}>_wr</Text>
          </Text>
        </Pressable>

        {/* Right Action buttons: AdShield badge & Theme toggle */}
        <View style={styles.actionButtonsGroup}>
          <NeumorphicButton
            onPress={onOpenExtensions}
            size="sm"
            style={styles.shieldButton}
            isActive={isAdBlockerActive}
            icon={
              <Ionicons
                name={isAdBlockerActive ? 'shield-checkmark' : 'shield-outline'}
                size={16}
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
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={16}
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
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'android' ? 10 : 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  circleBtn: {
    minWidth: 36,
    minHeight: 36,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 18,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  brandIconWrapper: {
    width: 24,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  brandText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  actionButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shieldButton: {
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 0,
    borderRadius: 18,
  },
});
