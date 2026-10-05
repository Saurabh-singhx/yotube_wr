import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { NeumorphicBox } from './neumorphic/NeumorphicBox';
import { NeumorphicButton } from './neumorphic/NeumorphicButton';
import { NeumorphicInput } from './neumorphic/NeumorphicInput';
import { triggerHaptic } from '../utils/haptics';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (targetUrl: string) => void;
  currentUrl?: string;
  hasActiveVideo?: boolean;
}

export const FEATURED_WEBAPPS = [
  {
    id: 'instagram',
    name: 'Instagram',
    url: 'https://www.instagram.com',
    icon: 'logo-instagram',
    color: '#E1306C',
    category: 'Social',
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    url: 'https://x.com',
    icon: 'logo-twitter',
    color: '#1DA1F2',
    category: 'Social',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    url: 'https://www.reddit.com',
    icon: 'logo-reddit',
    color: '#FF4500',
    category: 'Community',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    url: 'https://www.tiktok.com',
    icon: 'logo-tiktok',
    color: '#EE1D52',
    category: 'Video',
  },
  {
    id: 'twitch',
    name: 'Twitch',
    url: 'https://m.twitch.tv',
    icon: 'logo-twitch',
    color: '#9146FF',
    category: 'Live',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    url: 'https://m.youtube.com',
    icon: 'logo-youtube',
    color: '#FF0000',
    category: 'Video',
  },
  {
    id: 'google',
    name: 'Google',
    url: 'https://www.google.com',
    icon: 'logo-google',
    color: '#4285F4',
    category: 'Search',
  },
  {
    id: 'github',
    name: 'GitHub',
    url: 'https://github.com',
    icon: 'logo-github',
    color: '#6B7280',
    category: 'Dev',
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    url: 'https://m.soundcloud.com',
    icon: 'musical-notes',
    color: '#FF5500',
    category: 'Music',
  },
];

const YOUTUBE_TOPICS = [
  { label: 'Trending', query: 'https://m.youtube.com/feed/trending', isUrl: true, icon: 'flame' },
  { label: 'Music', query: 'https://m.youtube.com/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ', isUrl: true, icon: 'musical-notes' },
  { label: 'Gaming', query: 'https://m.youtube.com/gaming', isUrl: true, icon: 'game-controller' },
  { label: 'Podcasts', query: 'podcast', isUrl: false, icon: 'mic' },
  { label: 'Tech Reviews', query: 'tech reviews', isUrl: false, icon: 'hardware-chip' },
];

export const SearchModal: React.FC<SearchModalProps> = ({
  visible,
  onClose,
  onNavigate,
  hasActiveVideo = false,
}) => {
  const { palette } = useTheme();
  const [inputVal, setInputVal] = useState('');

  const handleOpenUrl = (target: string) => {
    let url = target.trim();
    if (!url) return;

    triggerHaptic();
    onClose();

    if (url.startsWith('http://') || url.startsWith('https://')) {
      onNavigate(url);
    } else if (url.includes('.') && !url.includes(' ')) {
      onNavigate('https://' + url);
    } else {
      // Default to Google search for arbitrary queries
      onNavigate(`https://www.google.com/search?q=${encodeURIComponent(url)}`);
    }
  };

  const handleSearchYouTube = (query: string) => {
    const text = query.trim();
    if (!text) return;
    triggerHaptic();
    onClose();
    onNavigate(`https://m.youtube.com/results?search_query=${encodeURIComponent(text)}`);
  };

  const isLikelyUrl = (text: string) => {
    const trimmed = text.trim();
    return (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      (trimmed.includes('.') && !trimmed.includes(' '))
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View
          style={[
            styles.modalContent,
            { backgroundColor: palette.surface, borderColor: palette.surfaceBorder },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconBox, { backgroundColor: palette.accent }]}>
                <Ionicons name="globe" size={18} color="#FFF" />
              </View>
              <View>
                <Text style={[styles.title, { color: palette.textPrimary }]}>
                  WebApps & Browser
                </Text>
                <Text style={[styles.subtitle, { color: palette.textMuted }]}>
                  Access Instagram, Reddit, X or any website
                </Text>
              </View>
            </View>

            <NeumorphicButton
              onPress={onClose}
              size="sm"
              style={styles.closeBtn}
              borderRadius={18}
              icon={<Ionicons name="close" size={20} color={palette.textPrimary} />}
            />
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Active PiP Banner Notice */}
            {hasActiveVideo && (
              <View
                style={[
                  styles.pipBanner,
                  { backgroundColor: palette.surfacePressed, borderColor: palette.accent },
                ]}
              >
                <Ionicons name="tv-outline" size={18} color={palette.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.pipBannerText, { color: palette.textPrimary }]}>
                  YouTube video is active! Switching webapps will keep playing in floating PiP mode.
                </Text>
              </View>
            )}

            {/* Address & Search Input */}
            <NeumorphicInput
              value={inputVal}
              onChangeText={setInputVal}
              placeholder="Enter website (e.g. instagram.com) or search..."
              autoFocus
              returnKeyType="go"
              onSubmitEditing={() => handleOpenUrl(inputVal)}
              leftIcon={<Ionicons name="compass-outline" size={20} color={palette.accent} />}
              onClear={() => setInputVal('')}
              containerStyle={styles.searchInputContainer}
            />

            {/* Smart Action Buttons when user types */}
            {inputVal.trim().length > 0 && (
              <View style={styles.actionRow}>
                <NeumorphicButton
                  onPress={() => handleOpenUrl(inputVal)}
                  title={isLikelyUrl(inputVal) ? 'Open Website' : 'Search Google'}
                  variant="accent"
                  size="md"
                  style={{ flex: 1, marginRight: 8 }}
                  icon={<Ionicons name={isLikelyUrl(inputVal) ? 'globe-outline' : 'logo-google'} size={16} color="#FFF" />}
                />
                <NeumorphicButton
                  onPress={() => handleSearchYouTube(inputVal)}
                  title="Search YouTube"
                  variant="primary"
                  size="md"
                  style={{ flex: 1 }}
                  icon={<Ionicons name="logo-youtube" size={16} color="#FFF" />}
                />
              </View>
            )}

            {/* Featured WebApps Grid */}
            <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>
              Featured WebApps (One-Tap Switch)
            </Text>

            <View style={styles.webAppsGrid}>
              {FEATURED_WEBAPPS.map((app) => (
                <Pressable
                  key={app.id}
                  onPress={() => handleOpenUrl(app.url)}
                  style={styles.webAppItemPressable}
                >
                  <NeumorphicBox
                    depth="low"
                    borderRadius={16}
                    style={styles.webAppCard}
                  >
                    <View style={[styles.webAppIconCircle, { backgroundColor: app.color }]}>
                      <Ionicons name={app.icon as any} size={22} color="#FFFFFF" />
                    </View>
                    <Text
                      style={[styles.webAppName, { color: palette.textPrimary }]}
                      numberOfLines={1}
                    >
                      {app.name}
                    </Text>
                    <Text style={[styles.webAppCategory, { color: palette.textMuted }]}>
                      {app.category}
                    </Text>
                  </NeumorphicBox>
                </Pressable>
              ))}
            </View>

            {/* YouTube Quick Topics */}
            <Text style={[styles.sectionTitle, { color: palette.textSecondary, marginTop: 18 }]}>
              YouTube Feeds & Topics
            </Text>

            <View style={styles.chipsGrid}>
              {YOUTUBE_TOPICS.map((topic) => (
                <Pressable
                  key={topic.label}
                  onPress={() => {
                    if (topic.isUrl) {
                      handleOpenUrl(topic.query);
                    } else {
                      handleSearchYouTube(topic.query);
                    }
                  }}
                  style={styles.chipPressable}
                >
                  <NeumorphicBox
                    depth="low"
                    borderRadius={14}
                    style={styles.topicChip}
                  >
                    <Ionicons
                      name={topic.icon as any}
                      size={15}
                      color={palette.primary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.topicLabel, { color: palette.textPrimary }]}>
                      {topic.label}
                    </Text>
                  </NeumorphicBox>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },
  pipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  pipBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  searchInputContainer: {
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  webAppsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  webAppItemPressable: {
    width: '31%',
    marginBottom: 4,
  },
  webAppCard: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 88,
  },
  webAppIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  webAppName: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  webAppCategory: {
    fontSize: 9,
    marginTop: 2,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipPressable: {
    marginBottom: 4,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topicLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
