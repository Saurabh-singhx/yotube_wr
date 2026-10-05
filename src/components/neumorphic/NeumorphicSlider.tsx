import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { triggerHaptic } from '../../utils/haptics';

interface NeumorphicSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onValueChange: (val: number) => void;
  style?: StyleProp<ViewStyle>;
  label?: string;
}

const THUMB_SIZE = 24;

export const NeumorphicSlider: React.FC<NeumorphicSliderProps> = ({
  value,
  min,
  max,
  step = 0.25,
  unit = '',
  onValueChange,
  style,
  label,
}) => {
  const { palette } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const clampAndSnap = useCallback(
    (rawVal: number) => {
      let clamped = Math.max(min, Math.min(max, rawVal));
      if (step > 0) {
        clamped = Math.round((clamped - min) / step) * step + min;
      }
      return Number(clamped.toFixed(2));
    },
    [min, max, step]
  );

  const calculateValueFromPosition = useCallback(
    (positionX: number) => {
      if (trackWidth <= 0) return value;
      const ratio = Math.max(0, Math.min(1, positionX / trackWidth));
      const rawVal = min + ratio * (max - min);
      return clampAndSnap(rawVal);
    },
    [trackWidth, value, min, max, clampAndSnap]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const x = evt.nativeEvent.locationX;
          const newVal = calculateValueFromPosition(x);
          if (newVal !== value) {
            triggerHaptic();
            onValueChange(newVal);
          }
        },
        onPanResponderMove: (evt, gestureState) => {
          const currentProgress = (value - min) / (max - min);
          const currentX = currentProgress * trackWidth;
          const newX = currentX + gestureState.dx;
          const newVal = calculateValueFromPosition(newX);
          if (newVal !== value) {
            triggerHaptic();
            onValueChange(newVal);
          }
        },
      }),
    [min, max, trackWidth, value, onValueChange, calculateValueFromPosition]
  );

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const progress = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const thumbLeft = Math.max(0, progress * trackWidth - THUMB_SIZE / 2);

  return (
    <View style={[styles.container, style]}>
      {label && (
        <View style={styles.headerRow}>
          <Text style={[styles.label, { color: palette.textPrimary }]}>{label}</Text>
          <Text style={[styles.valueText, { color: palette.accent }]}>
            {value}
            {unit}
          </Text>
        </View>
      )}

      <View
        style={styles.touchArea}
        onLayout={onLayout}
        {...panResponder.panHandlers}
      >
        {/* Recessed Track */}
        <View
          style={[
            styles.track,
            {
              backgroundColor: palette.surfacePressed,
              borderColor: palette.isDark ? '#0D0E12' : '#CAD3DF',
            },
          ]}
        >
          {/* Active progress fill */}
          <View
            style={[
              styles.fill,
              {
                width: `${progress * 100}%`,
                backgroundColor: palette.accent,
              },
            ]}
          />
        </View>

        {/* Protruding Thumb */}
        <View
          style={[
            styles.thumb,
            {
              left: thumbLeft,
              backgroundColor: palette.surfaceElevated,
              borderColor: palette.accent,
              shadowColor: palette.shadowDark,
            },
          ]}
        >
          <View
            style={[
              styles.innerDot,
              { backgroundColor: palette.accent },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '700',
  },
  touchArea: {
    height: 36,
    justifyContent: 'center',
  },
  track: {
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
