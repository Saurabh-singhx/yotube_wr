import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
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
  onSearch: (queryOrUrl: string) => void;
  currentUrl?: string;
}

const QUICK_TOPICS = [
  { label: 'Trending', query: 'https://m.youtube.com/feed/trending', isUrl: true, icon: 'flame' },
  { label: 'Music', query: 'https://m.youtube.com/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ', isUrl: true, icon: 'musical-notes' },
  { label: 'Gaming', query: 'https://m.youtube.com/gaming', isUrl: true, icon: 'game-controller' },
  { label: 'Podcasts', query: 'podcast', isUrl: false, icon: 'mic' },
  { label: 'Lofi Chill', query: 'lofi hip hop radio live', isUrl: false, icon: 'headset' },
  { label: 'Tech Reviews', query: 'tech reviews', isUrl: false, icon: 'hardware-chip' },
];

export const SearchModal: React.FC<SearchModalProps> = ({
  visible,
  onClose,
  onSearch,
}) => {
  const { palette } = useTheme();
  const [query, setQuery] = useState('');

  const handleExecute = (targetText: string, isDirectUrl = false) => {
    const text = targetText.trim();
    if (!text) return;

    triggerHaptic();
    onClose();

    if (isDirectUrl || text.startsWith('http://') || text.startsWith('https://')) {
      onSearch(text);
    } else if (text.includes('.') && !text.includes(' ')) {
      onSearch('https://' + text);
    } else {
      onSearch(`https://m.youtube.com/results?search_query=${encodeURIComponent(text)}`);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: palette.surface, borderColor: palette.surfaceBorder },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconBox, { backgroundColor: palette.primary }]}>
                <Ionicons name="search" size={18} color="#FFF" />
              </View>
              <Text style={[styles.title, { color: palette.textPrimary }]}>
                Search YouTube
              </Text>
            </View>

            <NeumorphicButton
              onPress={onClose}
              size="sm"
              style={styles.closeBtn}
              icon={<Ionicons name="close" size={20} color={palette.textPrimary} />}
            />
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Search Input */}
            <NeumorphicInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search videos, channels, or enter URL..."
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => handleExecute(query)}
              leftIcon={<Ionicons name="search" size={18} color={palette.accent} />}
              onClear={() => setQuery('')}
              containerStyle={styles.searchInputContainer}
            />

            {/* Quick Action Button */}
            <View style={styles.actionRow}>
              <NeumorphicButton
                onPress={() => handleExecute(query)}
                title="Search"
                variant="primary"
                size="md"
                style={{ flex: 1 }}
                icon={<Ionicons name="arrow-forward" size={16} color="#FFF" />}
              />
            </View>

            {/* Quick Categories */}
            <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>
              Explore & Suggestions
            </Text>

            <View style={styles.chipsGrid}>
              {QUICK_TOPICS.map((topic) => (
                <Pressable
                  key={topic.label}
                  onPress={() => handleExecute(topic.query, topic.isUrl)}
                >
                  <NeumorphicBox
                    depth="low"
                    borderRadius={14}
                    style={styles.topicChip}
                  >
                    <Ionicons
                      name={topic.icon as any}
                      size={14}
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
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '65%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    minWidth: 36,
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  searchInputContainer: {
    marginBottom: 12,
  },
  actionRow: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topicLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
