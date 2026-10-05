import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { NeumorphicDepth, NeumorphicState, getNeumorphicShadow } from '../../theme/neumorphism';

interface NeumorphicBoxProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  depth?: NeumorphicDepth;
  state?: NeumorphicState;
  borderRadius?: number;
  highlight?: boolean;
}

export const NeumorphicBox: React.FC<NeumorphicBoxProps> = ({
  children,
  style,
  depth = 'medium',
  state = 'elevated',
  borderRadius = 16,
  highlight = true,
}) => {
  const { palette } = useTheme();

  if (state === 'pressed' || state === 'inset') {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: palette.surfacePressed,
            borderRadius,
            borderColor: palette.isDark ? '#101216' : '#CCD5E2',
            borderWidth: 1.5,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  const baseShadow = getNeumorphicShadow(palette, depth, state);

  return (
    <View
      style={[
        styles.lightShadowWrapper,
        highlight && {
          shadowColor: palette.shadowLight,
          shadowOffset: depth === 'high' ? { width: -5, height: -5 } : { width: -3, height: -3 },
          shadowOpacity: palette.isDark ? 0.35 : 0.85,
          shadowRadius: depth === 'high' ? 10 : 6,
        },
        { borderRadius },
      ]}
    >
      <View
        style={[
          styles.container,
          baseShadow,
          {
            borderRadius,
            backgroundColor: palette.surfaceElevated,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  lightShadowWrapper: {
    // Outer shadow container providing the top-left highlight in neumorphism
  },
  container: {
    overflow: 'hidden',
  },
});
