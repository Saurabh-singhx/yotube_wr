import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useExtensions } from '../context/ExtensionContext';
import { NeumorphicBox } from './neumorphic/NeumorphicBox';
import { NeumorphicButton } from './neumorphic/NeumorphicButton';
import { NeumorphicSwitch } from './neumorphic/NeumorphicSwitch';
import { triggerHaptic } from '../utils/haptics';
import { APP_VERSION, APP_BUILD } from '../constants/version';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  isDesktopMode: boolean;
  onToggleDesktopMode: () => void;
  isZenActive: boolean;
  onToggleZenMode: () => void;
  isPipActive: boolean;
  onTogglePip: () => void;
  onOpenExtensions: () => void;
  onOpenWebApps: () => void;
  onOpenYouTubeSettings?: () => void;
  onOpenYouTubeLibrary?: () => void;
  isInstagram?: boolean;
  onToggleInstagramReelMode?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  isDesktopMode,
  onToggleDesktopMode,
  isZenActive,
  onToggleZenMode,
  isPipActive,
  onTogglePip,
  onOpenExtensions,
  onOpenWebApps,
  onOpenYouTubeSettings,
  onOpenYouTubeLibrary,
  isInstagram = false,
  onToggleInstagramReelMode,
}) => {
  const { palette, isDark, toggleTheme } = useTheme();
  const { stats, extensions, updateExtensionSettings } = useExtensions();

  const activeExtensionsCount = extensions.filter((e) => e.enabled).length;
  const igExt = extensions.find((e) => e.id === 'instagram-shield');
  const isReelModeEnabled = igExt ? (igExt.userSettings?.reelMode !== false && igExt.enabled !== false) : true;
  const isHighQualityEnabled = igExt ? (igExt.userSettings?.forceHighQuality !== false && igExt.enabled !== false) : true;
  const isHideDescriptionEnabled = igExt ? (igExt.userSettings?.hideReelDescription !== false && igExt.enabled !== false) : true;
  const isScreenAdjustEnabled = igExt ? (igExt.userSettings?.screenAdjustTwoFinger !== false && igExt.enabled !== false) : true;
  const isUnmuteEnabled = igExt ? (igExt.userSettings?.unmuteVideos !== false && igExt.enabled !== false) : true;

  const renderInstagramSection = (topPlacement = false) => (
    <View style={topPlacement ? { marginBottom: 14 } : { marginTop: 14 }}>
      <Text style={[styles.sectionHeading, { color: isInstagram ? '#E1306C' : palette.textMuted }]}>
        INSTAGRAM & REELS {isInstagram ? '• ACTIVE' : ''}
      </Text>

      {/* 1. Instagram Reel Mode */}
      <NeumorphicBox depth="low" borderRadius={16} style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <View
            style={[
              styles.settingIconWrap,
              { backgroundColor: isReelModeEnabled ? '#E1306C20' : palette.surfacePressed },
            ]}
          >
            <Ionicons
              name="film"
              size={20}
              color={isReelModeEnabled ? '#E1306C' : palette.textPrimary}
            />
          </View>
          <View style={styles.settingTextGroup}>
            <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
              Instagram Reel Mode
            </Text>
            <Text style={[styles.settingSubtitle, { color: palette.textMuted }]}>
              {isReelModeEnabled ? 'Fullscreen 1-reel immersive player with bottom buttons removed' : 'Standard feed view'}
            </Text>
          </View>
        </View>
        <NeumorphicSwitch
          value={isReelModeEnabled}
          onValueChange={() => {
            triggerHaptic();
            updateExtensionSettings('instagram-shield', { reelMode: !isReelModeEnabled });
            if (onToggleInstagramReelMode) {
              onToggleInstagramReelMode();
            }
          }}
        />
      </NeumorphicBox>

      {/* 2. Force High Video Quality */}
      <NeumorphicBox depth="low" borderRadius={16} style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <View
            style={[
              styles.settingIconWrap,
              { backgroundColor: isHighQualityEnabled ? palette.primary + '20' : palette.surfacePressed },
            ]}
          >
            <Ionicons
              name="sparkles"
              size={20}
              color={isHighQualityEnabled ? palette.primary : palette.textPrimary}
            />
          </View>
          <View style={styles.settingTextGroup}>
            <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
              Always High Quality (1080p / HD)
            </Text>
            <Text style={[styles.settingSubtitle, { color: palette.textMuted }]}>
              {isHighQualityEnabled ? 'Forces highest bitrate and prevents video quality drops' : 'Standard adaptive quality'}
            </Text>
          </View>
        </View>
        <NeumorphicSwitch
          value={isHighQualityEnabled}
          onValueChange={() => {
            triggerHaptic();
            updateExtensionSettings('instagram-shield', { forceHighQuality: !isHighQualityEnabled });
          }}
        />
      </NeumorphicBox>

      {/* 3. Hide Reel Description & Captions */}
      <NeumorphicBox depth="low" borderRadius={16} style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <View
            style={[
              styles.settingIconWrap,
              { backgroundColor: isHideDescriptionEnabled ? palette.accent + '20' : palette.surfacePressed },
            ]}
          >
            <Ionicons
              name="document-text-outline"
              size={20}
              color={isHideDescriptionEnabled ? palette.accent : palette.textPrimary}
            />
          </View>
          <View style={styles.settingTextGroup}>
            <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
              Hide Reel Description & Captions
            </Text>
            <Text style={[styles.settingSubtitle, { color: palette.textMuted }]}>
              {isHideDescriptionEnabled ? 'Captions, music info, and hashtags hidden for clean view' : 'Captions shown'}
            </Text>
          </View>
        </View>
        <NeumorphicSwitch
          value={isHideDescriptionEnabled}
          onValueChange={() => {
            triggerHaptic();
            updateExtensionSettings('instagram-shield', { hideReelDescription: !isHideDescriptionEnabled });
          }}
        />
      </NeumorphicBox>

      {/* 4. Two-Finger Screen Adjust & Pinch Zoom */}
      <NeumorphicBox depth="low" borderRadius={16} style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <View
            style={[
              styles.settingIconWrap,
              { backgroundColor: isScreenAdjustEnabled ? palette.success + '20' : palette.surfacePressed },
            ]}
          >
            <Ionicons
              name="scan-outline"
              size={20}
              color={isScreenAdjustEnabled ? palette.success : palette.textPrimary}
            />
          </View>
          <View style={styles.settingTextGroup}>
            <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
              Two-Finger Screen Adjust
            </Text>
            <Text style={[styles.settingSubtitle, { color: palette.textMuted }]}>
              {isScreenAdjustEnabled ? 'Pinch to zoom and two-finger tap for Fit vs Fill' : 'Gestures disabled'}
            </Text>
          </View>
        </View>
        <NeumorphicSwitch
          value={isScreenAdjustEnabled}
          onValueChange={() => {
            triggerHaptic();
            updateExtensionSettings('instagram-shield', { screenAdjustTwoFinger: !isScreenAdjustEnabled });
          }}
        />
      </NeumorphicBox>

      {/* 5. Auto-Unmute Videos */}
      <NeumorphicBox depth="low" borderRadius={16} style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <View
            style={[
              styles.settingIconWrap,
              { backgroundColor: isUnmuteEnabled ? palette.success + '20' : palette.surfacePressed },
            ]}
          >
            <Ionicons
              name="volume-high"
              size={20}
              color={isUnmuteEnabled ? palette.success : palette.textPrimary}
            />
          </View>
          <View style={styles.settingTextGroup}>
            <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
              Auto-Unmute Instagram Videos
            </Text>
            <Text style={[styles.settingSubtitle, { color: palette.textMuted }]}>
              {isUnmuteEnabled ? 'Videos play sound automatically' : 'Videos muted by default'}
            </Text>
          </View>
        </View>
        <NeumorphicSwitch
          value={isUnmuteEnabled}
          onValueChange={() => {
            triggerHaptic();
            updateExtensionSettings('instagram-shield', { unmuteVideos: !isUnmuteEnabled });
          }}
        />
      </NeumorphicBox>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <NeumorphicBox
          depth="high"
          borderRadius={24}
          style={[styles.modalContent, { backgroundColor: palette.surface }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <View
                style={[
                  styles.headerIconContainer,
                  { backgroundColor: palette.primary + '18' },
                ]}
              >
                <Ionicons name="settings-sharp" size={20} color={palette.primary} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>
                  Settings & Tools
                </Text>
                <Text style={[styles.headerSubtitle, { color: palette.textMuted }]}>
                  Display, playback & extensions
                </Text>
              </View>
            </View>

            <NeumorphicButton
              onPress={onClose}
              size="sm"
              style={styles.closeBtn}
              icon={<Ionicons name="close" size={18} color={palette.textPrimary} />}
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* AdShield Pro Stats Card */}
            <NeumorphicBox depth="low" borderRadius={16} style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: palette.success }]}>
                    {stats.adsBlocked}
                  </Text>
                  <Text style={[styles.statLabel, { color: palette.textMuted }]}>
                    Ads Blocked
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: palette.surfaceBorder }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: palette.accent }]}>
                    {stats.trackersBlocked}
                  </Text>
                  <Text style={[styles.statLabel, { color: palette.textMuted }]}>
                    Trackers
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: palette.surfaceBorder }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: palette.primary }]}>
                    {activeExtensionsCount}
                  </Text>
                  <Text style={[styles.statLabel, { color: palette.textMuted }]}>
                    Extensions
                  </Text>
                </View>
              </View>
            </NeumorphicBox>

            {/* When viewing Instagram, show Instagram & Reels settings prominently at the top */}
            {isInstagram && renderInstagramSection(true)}

            <Text style={[styles.sectionHeading, { color: palette.textMuted }]}>
              YOUTUBE ACCOUNT & SETTINGS
            </Text>

            {/* YouTube Native Settings & Account */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                onClose();
                if (onOpenYouTubeSettings) onOpenYouTubeSettings();
              }}
            >
              <NeumorphicBox depth="low" borderRadius={16} style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <View
                    style={[
                      styles.settingIconWrap,
                      { backgroundColor: palette.primary + '20' },
                    ]}
                  >
                    <Ionicons
                      name="logo-youtube"
                      size={20}
                      color={palette.primary}
                    />
                  </View>
                  <View style={styles.settingTextGroup}>
                    <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                      YouTube Settings & Account
                    </Text>
                    <Text style={[styles.settingSubtitle, { color: palette.textMuted }]}>
                      Account, video quality, history & preferences
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
              </NeumorphicBox>
            </Pressable>

            {/* YouTube Library & History */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                onClose();
                if (onOpenYouTubeLibrary) onOpenYouTubeLibrary();
              }}
            >
              <NeumorphicBox depth="low" borderRadius={16} style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <View
                    style={[
                      styles.settingIconWrap,
                      { backgroundColor: palette.accent + '20' },
                    ]}
                  >
                    <Ionicons
                      name="play-circle-outline"
                      size={20}
                      color={palette.accent}
                    />
                  </View>
                  <View style={styles.settingTextGroup}>
                    <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                      YouTube Library & History
                    </Text>
                    <Text style={[styles.settingSubtitle, { color: palette.textMuted }]}>
                      Playlists, subscriptions & watch history
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
              </NeumorphicBox>
            </Pressable>

            <Text style={[styles.sectionHeading, { color: palette.textMuted, marginTop: 14 }]}>
              DISPLAY & PLAYBACK
            </Text>

            {/* 1. Desktop Mode */}
            <NeumorphicBox depth="low" borderRadius={16} style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.settingIconWrap,
                    { backgroundColor: isDesktopMode ? palette.accent + '20' : palette.surfacePressed },
                  ]}
                >
                  <Ionicons
                    name={isDesktopMode ? 'desktop' : 'phone-portrait-outline'}
                    size={20}
                    color={isDesktopMode ? palette.accent : palette.textPrimary}
                  />
                </View>
                <View style={styles.settingTextGroup}>
                  <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                    Desktop Mode
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: palette.textMuted }]}>
                    {isDesktopMode ? 'Desktop version active' : 'Mobile web version active'}
                  </Text>
                </View>
              </View>
              <NeumorphicSwitch
                value={isDesktopMode}
                onValueChange={() => {
                  triggerHaptic();
                  onToggleDesktopMode();
                }}
              />
            </NeumorphicBox>

            {/* 2. Zen Mode */}
            <NeumorphicBox depth="low" borderRadius={16} style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.settingIconWrap,
                    { backgroundColor: isZenActive ? palette.success + '20' : palette.surfacePressed },
                  ]}
                >
                  <Ionicons
                    name="leaf"
                    size={20}
                    color={isZenActive ? palette.success : palette.textPrimary}
                  />
                </View>
                <View style={styles.settingTextGroup}>
                  <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                    Zen Mode
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: palette.textMuted }]}>
                    Hide comments, shorts & suggestions
                  </Text>
                </View>
              </View>
              <NeumorphicSwitch
                value={isZenActive}
                onValueChange={() => {
                  triggerHaptic();
                  onToggleZenMode();
                }}
              />
            </NeumorphicBox>

            {/* 3. Dark Theme */}
            <NeumorphicBox depth="low" borderRadius={16} style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.settingIconWrap,
                    { backgroundColor: isDark ? '#F59E0B20' : palette.surfacePressed },
                  ]}
                >
                  <Ionicons
                    name={isDark ? 'moon' : 'sunny'}
                    size={20}
                    color={isDark ? '#F59E0B' : palette.textPrimary}
                  />
                </View>
                <View style={styles.settingTextGroup}>
                  <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                    Dark Theme
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: palette.textMuted }]}>
                    {isDark ? 'Dark appearance enabled' : 'Light appearance enabled'}
                  </Text>
                </View>
              </View>
              <NeumorphicSwitch
                value={isDark}
                onValueChange={() => {
                  triggerHaptic();
                  toggleTheme();
                }}
              />
            </NeumorphicBox>

            {/* 4. Picture-in-Picture (PiP) */}
            <NeumorphicBox depth="low" borderRadius={16} style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.settingIconWrap,
                    { backgroundColor: isPipActive ? palette.primary + '20' : palette.surfacePressed },
                  ]}
                >
                  <Ionicons
                    name="albums-outline"
                    size={20}
                    color={isPipActive ? palette.primary : palette.textPrimary}
                  />
                </View>
                <View style={styles.settingTextGroup}>
                  <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                    Picture-in-Picture (PiP)
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: palette.textMuted }]}>
                    {isPipActive ? 'Floating miniplayer active' : 'Pop current video to miniplayer'}
                  </Text>
                </View>
              </View>
              <NeumorphicButton
                onPress={() => {
                  triggerHaptic();
                  onTogglePip();
                  onClose();
                }}
                size="sm"
                title={isPipActive ? 'Close PiP' : 'Start PiP'}
                isActive={isPipActive}
              />
            </NeumorphicBox>

            {/* If not viewing Instagram, show Instagram & Reels section here */}
            {!isInstagram && renderInstagramSection(false)}

            <Text style={[styles.sectionHeading, { color: palette.textMuted, marginTop: 18 }]}>
              WEBAPPS & HUBS
            </Text>

            {/* 5. WebApps & Browser Hub */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                onClose();
                onOpenWebApps();
              }}
            >
              <NeumorphicBox depth="low" borderRadius={16} style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <View
                    style={[
                      styles.settingIconWrap,
                      { backgroundColor: palette.accent + '20' },
                    ]}
                  >
                    <Ionicons
                      name="globe-outline"
                      size={20}
                      color={palette.accent}
                    />
                  </View>
                  <View style={styles.settingTextGroup}>
                    <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                      WebApps Hub & Search
                    </Text>
                    <Text style={[styles.settingSubtitle, { color: palette.textMuted }]}>
                      Instagram, X, Reddit, Twitch, URLs
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
              </NeumorphicBox>
            </Pressable>

            <Text style={[styles.sectionHeading, { color: palette.textMuted, marginTop: 14 }]}>
              ADVANCED EXTENSIONS
            </Text>

            {/* 5. Extensions Hub Button */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                onClose();
                onOpenExtensions();
              }}
            >
              <NeumorphicBox depth="low" borderRadius={16} style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <View
                    style={[
                      styles.settingIconWrap,
                      { backgroundColor: palette.success + '20' },
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={20}
                      color={palette.success}
                    />
                  </View>
                  <View style={styles.settingTextGroup}>
                    <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                      Extensions & AdBlocker Hub
                    </Text>
                    <Text style={[styles.settingSubtitle, { color: palette.textMuted }]}>
                      Auto-HD, SponsorBlock, Custom Scripts
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
              </NeumorphicBox>
            </Pressable>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: palette.textMuted }]}>
                YouTube_wr v{APP_VERSION} ({APP_BUILD}) • Pure 2-Finger Zoom Enabled
              </Text>
            </View>
          </ScrollView>
        </NeumorphicBox>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  statsCard: {
    padding: 14,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  settingIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextGroup: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
  },
  footerText: {
    fontSize: 11,
  },
});
