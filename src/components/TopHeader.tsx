import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useExtensions } from '../context/ExtensionContext';
import { NeumorphicBox } from './neumorphic/NeumorphicBox';
import { NeumorphicButton } from './neumorphic/NeumorphicButton';
import { NeumorphicInput } from './neumorphic/NeumorphicInput';

interface TopHeaderProps {
  currentUrl: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onNavigate: (url: string) => void;
  onOpenExtensions: () => void;
  onOpenPlayback: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentUrl,
  canGoBack,
  canGoForward,
  isLoading,
  onGoBack,
  onGoForward,
  onReload,
  onNavigate,
  onOpenExtensions,
}) => {
  const { palette, isDark, toggleTheme } = useTheme();
  const { stats, extensions } = useExtensions();
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [prevCurrentUrl, setPrevCurrentUrl] = useState(currentUrl);

  if (currentUrl !== prevCurrentUrl) {
    setPrevCurrentUrl(currentUrl);
    if (!isEditingUrl) {
      setUrlInput(currentUrl);
    }
  }

  const adBlockerExt = extensions.find((e) => e.id === 'youtube-adblocker');
  const isAdBlockerActive = adBlockerExt?.enabled ?? false;

  const handleSubmitUrl = () => {
    setIsEditingUrl(false);
    let target = urlInput.trim();
    if (!target) return;

    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      if (target.includes('.') && !target.includes(' ')) {
        target = 'https://' + target;
      } else {
        // Search query on YouTube
        target = `https://m.youtube.com/results?search_query=${encodeURIComponent(target)}`;
      }
    }
    onNavigate(target);
  };

  const getCleanDomain = (url: string) => {
    try {
      const match = url.match(/^https?:\/\/(?:www\.|m\.)?([^\/]+)/);
      return match ? match[1] : 'youtube.com';
    } catch {
      return 'youtube.com';
    }
  };

  return (
    <View style={[styles.headerContainer, { backgroundColor: palette.surface }]}>
      {/* Top action row */}
      <View style={styles.topRow}>
        {/* Navigation buttons */}
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

        {/* Brand / Logo */}
        <Pressable
          onPress={() => onNavigate('https://m.youtube.com')}
          style={styles.brandContainer}
        >
          <View style={[styles.brandIconWrapper, { backgroundColor: palette.primary }]}>
            <Ionicons name="play" size={14} color="#FFF" style={{ marginLeft: 2 }} />
          </View>
          <Text style={[styles.brandText, { color: palette.textPrimary }]}>
            YT<Text style={{ color: palette.primary }}>_wr</Text>
          </Text>
        </Pressable>

        {/* Right Action buttons */}
        <View style={styles.actionButtonsGroup}>
          {/* AdShield Badge Button */}
          <NeumorphicButton
            onPress={onOpenExtensions}
            size="sm"
            style={[styles.shieldButton]}
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

          {/* Theme switcher */}
          <NeumorphicButton
            onPress={toggleTheme}
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

      {/* URL / Search Bar */}
      <View style={styles.urlRow}>
        {isEditingUrl ? (
          <NeumorphicInput
            value={urlInput}
            onChangeText={setUrlInput}
            onSubmitEditing={handleSubmitUrl}
            onBlur={() => setIsEditingUrl(false)}
            autoFocus
            selectTextOnFocus
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            leftIcon={<Ionicons name="search" size={16} color={palette.accent} />}
            onClear={() => setUrlInput('')}
            containerStyle={styles.urlInputContainer}
          />
        ) : (
          <Pressable
            onPress={() => setIsEditingUrl(true)}
            style={styles.urlDisplayPressable}
          >
            <NeumorphicBox state="inset" borderRadius={14} style={styles.urlDisplayBox}>
              <View style={styles.urlContent}>
                <Ionicons
                  name={currentUrl.startsWith('https') ? 'lock-closed' : 'globe-outline'}
                  size={14}
                  color={palette.success}
                  style={styles.urlLockIcon}
                />
                <Text
                  style={[styles.domainText, { color: palette.textPrimary }]}
                  numberOfLines={1}
                >
                  {getCleanDomain(currentUrl)}
                </Text>
                <Text
                  style={[styles.pathText, { color: palette.textMuted }]}
                  numberOfLines={1}
                >
                  {currentUrl.replace(/^https?:\/\/[^\/]+/, '') || '/'}
                </Text>
              </View>
              <Ionicons name="search-outline" size={16} color={palette.textMuted} />
            </NeumorphicBox>
          </Pressable>
        )}
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
    marginBottom: 8,
  },
  navButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  circleBtn: {
    minWidth: 34,
    minHeight: 34,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 17,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
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
    gap: 6,
  },
  shieldButton: {
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 0,
    borderRadius: 17,
  },
  urlRow: {
    width: '100%',
  },
  urlDisplayPressable: {
    width: '100%',
  },
  urlDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 38,
  },
  urlContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  urlLockIcon: {
    marginRight: 6,
  },
  domainText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pathText: {
    fontSize: 12,
    flex: 1,
    marginLeft: 2,
  },
  urlInputContainer: {
    minHeight: 38,
    paddingVertical: 0,
  },
});
