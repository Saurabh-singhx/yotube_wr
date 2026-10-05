import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { NeumorphicBox } from './neumorphic/NeumorphicBox';
import { NeumorphicButton } from './neumorphic/NeumorphicButton';
import { NeumorphicSlider } from './neumorphic/NeumorphicSlider';
import { NeumorphicSwitch } from './neumorphic/NeumorphicSwitch';

interface PlaybackControlsModalProps {
  visible: boolean;
  onClose: () => void;
  speed: number;
  volumeBoost: number;
  isLooping: boolean;
  onSpeedChange: (speed: number) => void;
  onVolumeBoostChange: (boost: number) => void;
  onToggleLoop: (loop: boolean) => void;
}

const SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

export const PlaybackControlsModal: React.FC<PlaybackControlsModalProps> = ({
  visible,
  onClose,
  speed,
  volumeBoost,
  isLooping,
  onSpeedChange,
  onVolumeBoostChange,
  onToggleLoop,
}) => {
  const { palette } = useTheme();

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
                <Ionicons name="speedometer" size={18} color="#FFF" />
              </View>
              <Text style={[styles.title, { color: palette.textPrimary }]}>
                Audio & Playback Controls
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
            {/* Speed Presets Grid */}
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
              Playback Speed
            </Text>

            <View style={styles.presetsGrid}>
              {SPEED_PRESETS.map((preset) => {
                const isSelected = speed === preset;
                return (
                  <NeumorphicButton
                    key={preset}
                    onPress={() => onSpeedChange(preset)}
                    size="sm"
                    isActive={isSelected}
                    title={`${preset}x`}
                    style={styles.presetButton}
                    textStyle={{
                      fontWeight: isSelected ? '800' : '600',
                      fontSize: 13,
                    }}
                  />
                );
              })}
            </View>

            {/* Precision Speed Slider */}
            <NeumorphicSlider
              label="Fine-tune Speed"
              value={speed}
              min={0.25}
              max={3.5}
              step={0.05}
              unit="x"
              onValueChange={onSpeedChange}
              style={{ marginTop: 14 }}
            />

            {/* Volume Booster Section */}
            <View style={styles.divider} />

            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                Audio Volume Booster
              </Text>
              <Text style={[styles.badgeText, { color: palette.accent }]}>
                Web Audio Gain
              </Text>
            </View>

            <NeumorphicSlider
              label="Boost Level"
              value={volumeBoost}
              min={100}
              max={300}
              step={10}
              unit="%"
              onValueChange={onVolumeBoostChange}
            />

            {/* Loop Video Switch */}
            <View style={styles.divider} />

            <NeumorphicBox depth="low" borderRadius={16} style={styles.toggleRowBox}>
              <View style={styles.toggleInfoCol}>
                <Text style={[styles.toggleLabel, { color: palette.textPrimary }]}>
                  Loop Video Continuously
                </Text>
                <Text style={[styles.toggleSub, { color: palette.textMuted }]}>
                  Automatically replay current video upon finishing
                </Text>
              </View>

              <NeumorphicSwitch
                value={isLooping}
                onValueChange={onToggleLoop}
              />
            </NeumorphicBox>

            {/* Done button */}
            <View style={{ marginTop: 24, marginBottom: 12 }}>
              <NeumorphicButton
                onPress={onClose}
                title="Apply & Close"
                variant="accent"
                size="lg"
              />
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
    maxHeight: '75%',
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  presetButton: {
    minWidth: 62,
    height: 38,
    borderRadius: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 18,
  },
  toggleRowBox: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfoCol: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  toggleSub: {
    fontSize: 12,
  },
});
