import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      Haptics.impactAsync(style);
    } catch {
      // Ignore if haptics fail or aren't supported on device
    }
  }
};

export const triggerNotificationHaptic = (type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      Haptics.notificationAsync(type);
    } catch {
      // Ignore
    }
  }
};
