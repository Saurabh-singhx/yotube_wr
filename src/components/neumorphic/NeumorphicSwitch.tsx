import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Animated, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { triggerHaptic } from '../../utils/haptics';

interface NeumorphicSwitchProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
}

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 28;
const THUMB_SIZE = 22;
const PADDING = 3;

export const NeumorphicSwitch: React.FC<NeumorphicSwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
}) => {
  const { palette } = useTheme();
  const [animatedValue] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 60,
    }).start();
  }, [value, animatedValue]);

  const handleToggle = () => {
    if (disabled) return;
    triggerHaptic();
    onValueChange(!value);
  };

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [PADDING, TRACK_WIDTH - THUMB_SIZE - PADDING],
  });

  const trackBgColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [palette.surfacePressed, palette.accent],
  });

  const trackBorderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [
      palette.isDark ? '#0F1115' : '#CAD3DF',
      palette.isDark ? '#00A3A4' : '#0072DD',
    ],
  });

  return (
    <Pressable
      onPress={handleToggle}
      disabled={disabled}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: trackBgColor,
            borderColor: trackBorderColor,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [{ translateX }],
              backgroundColor: palette.surfaceElevated,
              shadowColor: palette.shadowDark,
              borderColor: palette.surfaceBorder,
            },
          ]}
        >
          {/* Subtle indicator dot inside thumb */}
          <View
            style={[
              styles.thumbInnerDot,
              {
                backgroundColor: value ? palette.accent : palette.textMuted,
                opacity: value ? 1 : 0.4,
              },
            ]}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 1,
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
