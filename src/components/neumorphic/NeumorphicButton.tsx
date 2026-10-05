import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  StyleProp,
  TextStyle,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { triggerHaptic } from '../../utils/haptics';
import { NeumorphicBox } from './NeumorphicBox';

interface NeumorphicButtonProps {
  onPress: () => void;
  title?: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  isActive?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'surface' | 'primary' | 'accent';
  borderRadius?: number;
  badge?: number | string;
}

export const NeumorphicButton: React.FC<NeumorphicButtonProps> = ({
  onPress,
  title,
  icon,
  style,
  textStyle,
  isActive = false,
  disabled = false,
  size = 'md',
  variant = 'surface',
  borderRadius = 14,
  badge,
}) => {
  const { palette } = useTheme();
  const [isPressed, setIsPressed] = useState(false);

  const flatStyle = (StyleSheet.flatten(style) || {}) as ViewStyle;
  const isFixedDimension = !!(flatStyle.width && flatStyle.height);
  const resolvedBorderRadius =
    flatStyle.borderRadius !== undefined
      ? (flatStyle.borderRadius as number)
      : borderRadius;

  const handlePress = () => {
    if (disabled) return;
    triggerHaptic();
    onPress();
  };

  const sizeStyles = {
    sm: { paddingVertical: 6, paddingHorizontal: 10, minHeight: 38, minWidth: 38 },
    md: { paddingVertical: 10, paddingHorizontal: 14, minHeight: 44, minWidth: 44 },
    lg: { paddingVertical: 14, paddingHorizontal: 20, minHeight: 52, minWidth: 52 },
  };

  const getTextColor = () => {
    if (disabled) return palette.textMuted;
    if (isActive) return palette.accent;
    if (variant === 'primary') return '#FFFFFF';
    return palette.textPrimary;
  };

  const getBackgroundColor = () => {
    if (isPressed || isActive) return palette.surfacePressed;
    if (variant === 'primary') return palette.primary;
    if (variant === 'accent') return palette.accent;
    return palette.surfaceElevated;
  };

  const isSunken = isPressed || isActive;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => !disabled && setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[{ opacity: disabled ? 0.45 : 1 }, style]}
    >
      <NeumorphicBox
        state={isSunken ? 'pressed' : 'elevated'}
        depth={size === 'sm' ? 'low' : 'medium'}
        borderRadius={resolvedBorderRadius}
        style={[
          styles.buttonBase,
          isFixedDimension
            ? { width: '100%', height: '100%', paddingHorizontal: 0, paddingVertical: 0 }
            : sizeStyles[size],
          flatStyle.flex !== undefined ? { flex: 1, width: '100%' } : undefined,
          {
            backgroundColor: getBackgroundColor(),
            borderColor: isActive
              ? palette.accent
              : isSunken
              ? (palette.isDark ? '#0A0C0E' : '#CAD4E0')
              : palette.surfaceBorder,
            borderWidth: isActive ? 1.5 : 1,
          },
        ]}
      >
        <View style={styles.contentRow}>
          {icon && <View style={title ? styles.iconSpacing : undefined}>{icon}</View>}
          {title ? (
            <Text
              style={[
                styles.buttonText,
                { color: getTextColor() },
                size === 'sm' && styles.textSm,
                size === 'lg' && styles.textLg,
                textStyle,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : null}
        </View>
      </NeumorphicBox>

      {/* Badge placed on outer pressable so it is never clipped */}
      {badge !== undefined && badge !== 0 && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: palette.primary,
              borderColor: palette.surface,
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSpacing: {
    marginRight: 6,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 12,
  },
  textLg: {
    fontSize: 16,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    zIndex: 10,
    elevation: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
