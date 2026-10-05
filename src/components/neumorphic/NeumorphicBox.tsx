import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { NeumorphicDepth, NeumorphicState } from '../../theme/neumorphism';

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
  const isPressed = state === 'pressed' || state === 'inset';

  const flatStyle = (StyleSheet.flatten(style) || {}) as ViewStyle;
  const {
    margin,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    marginHorizontal,
    marginVertical,
    alignSelf,
    flex,
    position,
    top,
    bottom,
    left,
    right,
    zIndex,
    width,
    height,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    ...innerStyles
  } = flatStyle;

  const outerLayout: ViewStyle = {
    margin,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    marginHorizontal,
    marginVertical,
    alignSelf,
    flex,
    position,
    top,
    bottom,
    left,
    right,
    zIndex,
    width,
    height,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
  };

  return (
    <View
      style={[
        styles.lightShadowWrapper,
        { borderRadius },
        !isPressed && highlight && {
          shadowColor: palette.shadowLight,
          shadowOffset: depth === 'high' ? { width: -3, height: -3 } : { width: -2, height: -2 },
          shadowOpacity: palette.isDark ? 0.3 : 0.85,
          shadowRadius: depth === 'high' ? 6 : 4,
        },
        outerLayout,
      ]}
    >
      <View
        style={[
          styles.container,
          {
            borderRadius,
            backgroundColor: isPressed ? palette.surfacePressed : palette.surfaceElevated,
            borderColor: isPressed
              ? (palette.isDark ? '#0A0C0E' : '#CAD4E0')
              : palette.surfaceBorder,
            borderWidth: isPressed ? 1.5 : 1,
            width: width !== undefined ? '100%' : undefined,
            height: height !== undefined ? '100%' : undefined,
            flex: flex !== undefined ? 1 : undefined,
          },
          !isPressed && {
            shadowColor: palette.shadowDark,
            shadowOffset: depth === 'high' ? { width: 4, height: 4 } : { width: 2, height: 2 },
            shadowOpacity: palette.isDark ? 0.6 : 0.35,
            shadowRadius: depth === 'high' ? 6 : 4,
            elevation: depth === 'high' ? 5 : 2,
          },
          innerStyles,
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
    // Inner surface container
  },
});
