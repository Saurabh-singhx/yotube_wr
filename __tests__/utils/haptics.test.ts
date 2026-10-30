import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { triggerHaptic, triggerNotificationHaptic } from '../../src/utils/haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

describe('haptics utility', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    (Platform as any).OS = originalPlatform;
    jest.clearAllMocks();
  });

  it('triggers impactAsync on mobile platform (android)', () => {
    (Platform as any).OS = 'android';
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
  });

  it('triggers impactAsync on mobile platform (ios)', () => {
    (Platform as any).OS = 'ios';
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('does not trigger on web platform', () => {
    (Platform as any).OS = 'web';
    triggerHaptic();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('triggers notificationAsync on mobile platform', () => {
    (Platform as any).OS = 'android';
    triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('safely catches errors if haptics fail', () => {
    (Platform as any).OS = 'android';
    (Haptics.impactAsync as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Device has no vibrator');
    });

    expect(() => triggerHaptic()).not.toThrow();
  });
});
