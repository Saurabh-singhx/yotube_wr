import React, { useState } from 'react';
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
import { NeumorphicBadge } from './neumorphic/NeumorphicBadge';

interface ExtensionsModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenCreateCustom: () => void;
}

export const ExtensionsModal: React.FC<ExtensionsModalProps> = ({
  visible,
  onClose,
  onOpenCreateCustom,
}) => {
  const { palette } = useTheme();
  const {
    extensions,
    stats,
    toggleExtension,
    updateExtensionSettings,
    deleteCustomExtension,
    resetStats,
  } = useExtensions();

  const [expandedExtId, setExpandedExtId] = useState<string | null>(null);

  const formatTimeSaved = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const toggleExpand = (id: string) => {
    setExpandedExtId(expandedExtId === id ? null : id);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'adblock':
        return palette.success;
      case 'playback':
        return palette.accent;
      case 'ui':
        return '#8B5CF6';
      case 'custom':
        return '#EC4899';
      default:
        return palette.primary;
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
              <View style={[styles.headerIconBox, { backgroundColor: palette.accent }]}>
                <Ionicons name="extension-puzzle" size={18} color="#FFF" />
              </View>
              <Text style={[styles.title, { color: palette.textPrimary }]}>
                Extension Engine
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
          >
            {/* Real-time AdBlock Stats Hero Card */}
            <NeumorphicBox
              depth="medium"
              borderRadius={20}
              style={styles.statsCard}
            >
              <View style={styles.statsHeaderRow}>
                <View style={styles.statsTitleGroup}>
                  <Ionicons name="shield-checkmark" size={20} color={palette.success} />
                  <Text style={[styles.statsCardTitle, { color: palette.textPrimary }]}>
                    Protection Overview
                  </Text>
                </View>
                {stats.adsBlocked > 0 && (
                  <Pressable onPress={resetStats}>
                    <Text style={[styles.resetText, { color: palette.textMuted }]}>
                      Reset
                    </Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.statsMetricsRow}>
                <View style={styles.statMetric}>
                  <Text style={[styles.statValue, { color: palette.success }]}>
                    {stats.adsBlocked}
                  </Text>
                  <Text style={[styles.statLabel, { color: palette.textMuted }]}>
                    Ads Blocked
                  </Text>
                </View>

                <View style={[styles.statDivider, { backgroundColor: palette.surfacePressed }]} />

                <View style={styles.statMetric}>
                  <Text style={[styles.statValue, { color: palette.accent }]}>
                    {stats.trackersBlocked}
                  </Text>
                  <Text style={[styles.statLabel, { color: palette.textMuted }]}>
                    Trackers Stopped
                  </Text>
                </View>

                <View style={[styles.statDivider, { backgroundColor: palette.surfacePressed }]} />

                <View style={styles.statMetric}>
                  <Text style={[styles.statValue, { color: palette.primary }]}>
                    {formatTimeSaved(stats.timeSavedSeconds)}
                  </Text>
                  <Text style={[styles.statLabel, { color: palette.textMuted }]}>
                    Time Saved
                  </Text>
                </View>
              </View>
            </NeumorphicBox>

            {/* Installed Extensions Section */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeading, { color: palette.textPrimary }]}>
                Installed Extensions ({extensions.length})
              </Text>

              <NeumorphicButton
                onPress={onOpenCreateCustom}
                size="sm"
                title="+ Add Custom"
                variant="accent"
                textStyle={{ fontSize: 12, fontWeight: '700' }}
              />
            </View>

            {extensions.map((ext) => {
              const isExpanded = expandedExtId === ext.id;
              const hasSettings = ext.settings && ext.settings.length > 0;

              return (
                <NeumorphicBox
                  key={ext.id}
                  depth="low"
                  borderRadius={18}
                  style={[
                    styles.extensionCard,
                    ext.enabled && {
                      borderColor: palette.accent + '44',
                      borderWidth: 1,
                    },
                  ]}
                >
                  <View style={styles.extMainRow}>
                    {/* Icon */}
                    <View
                      style={[
                        styles.extIconWrapper,
                        {
                          backgroundColor: ext.enabled
                            ? getCategoryColor(ext.category)
                            : palette.surfacePressed,
                        },
                      ]}
                    >
                      <Ionicons
                        name={(ext.icon as any) || 'cube'}
                        size={20}
                        color={ext.enabled ? '#FFF' : palette.textMuted}
                      />
                    </View>

                    {/* Details */}
                    <View style={styles.extInfo}>
                      <View style={styles.extNameRow}>
                        <Text
                          style={[styles.extName, { color: palette.textPrimary }]}
                          numberOfLines={1}
                        >
                          {ext.name}
                        </Text>
                        <NeumorphicBadge
                          label={`v${ext.version}`}
                          size="sm"
                          style={{ marginLeft: 6 }}
                        />
                      </View>
                      <Text
                        style={[styles.extDescription, { color: palette.textSecondary }]}
                        numberOfLines={isExpanded ? undefined : 2}
                      >
                        {ext.description}
                      </Text>
                    </View>

                    {/* Switch */}
                    <View style={styles.switchWrapper}>
                      <NeumorphicSwitch
                        value={ext.enabled}
                        onValueChange={() => toggleExtension(ext.id)}
                      />
                    </View>
                  </View>

                  {/* Footer actions / Sub-settings toggle */}
                  <View style={styles.extCardFooter}>
                    {hasSettings && (
                      <Pressable
                        onPress={() => toggleExpand(ext.id)}
                        style={styles.expandButton}
                      >
                        <Text style={[styles.expandText, { color: palette.accent }]}>
                          {isExpanded ? 'Hide Settings' : 'Configure Settings'}
                        </Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color={palette.accent}
                        />
                      </Pressable>
                    )}

                    {ext.isCustom && (
                      <Pressable
                        onPress={() => deleteCustomExtension(ext.id)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={14} color={palette.primary} />
                        <Text style={[styles.deleteText, { color: palette.primary }]}>
                          Remove
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  {/* Expandable Sub-settings */}
                  {isExpanded && hasSettings && (
                    <View
                      style={[
                        styles.settingsContainer,
                        {
                          backgroundColor: palette.surfacePressed,
                          borderColor: palette.surfaceBorder,
                        },
                      ]}
                    >
                      {ext.settings!.map((setting) => {
                        const currentValue =
                          ext.userSettings?.[setting.id] !== undefined
                            ? ext.userSettings[setting.id]
                            : setting.default;

                        return (
                          <View key={setting.id} style={styles.settingItemRow}>
                            <View style={styles.settingLabelCol}>
                              <Text
                                style={[
                                  styles.settingLabel,
                                  { color: palette.textPrimary },
                                ]}
                              >
                                {setting.label}
                              </Text>
                              <Text
                                style={[
                                  styles.settingDescription,
                                  { color: palette.textMuted },
                                ]}
                              >
                                {setting.description}
                              </Text>
                            </View>

                            {setting.type === 'boolean' && (
                              <NeumorphicSwitch
                                value={!!currentValue}
                                onValueChange={(val) => {
                                  updateExtensionSettings(ext.id, {
                                    [setting.id]: val,
                                  });
                                }}
                              />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </NeumorphicBox>
              );
            })}
          </ScrollView>
        </View>
      </View>
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
    height: '85%',
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
    paddingBottom: 12,
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
    fontSize: 20,
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
    paddingBottom: 40,
  },
  statsCard: {
    padding: 16,
    marginBottom: 20,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statsTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  resetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statMetric: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
  },
  extensionCard: {
    padding: 16,
    marginBottom: 12,
  },
  extMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  extIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  extInfo: {
    flex: 1,
    marginRight: 10,
  },
  extNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  extName: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  extDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  switchWrapper: {
    marginLeft: 6,
  },
  extCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '600',
  },
  settingsContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  settingItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  settingLabelCol: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 11,
    lineHeight: 14,
  },
});
