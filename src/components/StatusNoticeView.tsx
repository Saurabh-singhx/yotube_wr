import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  BackHandler,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { NeumorphicBox } from './neumorphic/NeumorphicBox';
import { NeumorphicButton } from './neumorphic/NeumorphicButton';
import { triggerHaptic } from '../utils/haptics';

interface StatusNoticeViewProps {
  title?: string;
  message?: string;
  actionText?: string;
  actionUrl?: string;
}

export const StatusNoticeView: React.FC<StatusNoticeViewProps> = ({
  title = 'Service Update Required',
  message = 'A critical update is required to continue using this application.',
  actionText = 'Download Update',
  actionUrl = 'https://github.com/Saurabh-singhx/yotube_wr/releases',
}) => {
  const { palette } = useTheme();

  const handleAction = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (actionUrl) {
      try {
        await Linking.openURL(actionUrl);
      } catch {
        // Safe fallback
      }
    }
  };

  const handleExit = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    if (Platform.OS === 'android') {
      BackHandler.exitApp();
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <NeumorphicBox
        state="elevated"
        borderRadius={28}
        style={styles.card}
      >
        <View style={styles.iconContainer}>
          <NeumorphicBox
            state="pressed"
            borderRadius={40}
            style={styles.iconCircle}
          >
            <Ionicons name="cloud-download-outline" size={40} color={palette.accent} />
          </NeumorphicBox>
        </View>

        <Text style={[styles.title, { color: palette.textPrimary }]}>{title}</Text>
        <Text style={[styles.message, { color: palette.textSecondary }]}>{message}</Text>

        <View style={styles.actions}>
          <NeumorphicButton
            title={actionText}
            variant="accent"
            size="lg"
            onPress={handleAction}
            style={styles.actionBtn}
            icon={<Ionicons name="arrow-down-circle-outline" size={20} color="#FFFFFF" style={styles.btnIcon} />}
          />

          {Platform.OS === 'android' && (
            <NeumorphicButton
              title="Close App"
              variant="surface"
              size="md"
              onPress={handleExit}
              style={styles.exitBtn}
              icon={<Ionicons name="exit-outline" size={18} color={palette.textSecondary} style={styles.btnIcon} />}
            />
          )}
        </View>
      </NeumorphicBox>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 28,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  actions: {
    width: '100%',
    gap: 14,
  },
  actionBtn: {
    width: '100%',
  },
  exitBtn: {
    width: '100%',
  },
  btnIcon: {
    marginRight: 8,
  },
});
