import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, ViewStyle, StyleProp, TextStyle, View } from 'react-native';
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

  const handlePressIn = () => {
    if (disabled) return;
    setIsPressed(true);
    triggerHaptic();
  };

  const handlePressOut = () => {
    setIsPressed(false);
  };

  const sizeStyles = {
    sm: { paddingVertical: 6, paddingHorizontal: 10, minHeight: 34, minWidth: 34 },
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
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={({ pressed }) => [{ opacity: disabled ? 0.5 : 1 }]}
    >
      <NeumorphicBox
        state={isSunken ? 'pressed' : 'elevated'}
        depth={size === 'sm' ? 'low' : 'medium'}
        borderRadius={borderRadius}
        style={[
          styles.buttonBase,
          sizeStyles[size],
          {
            backgroundColor: getBackgroundColor(),
            borderColor: isActive
              ? palette.accent
              : isSunken
              ? (palette.isDark ? '#0A0C0E' : '#C0CBD8')
              : palette.surfaceBorder,
            borderWidth: isActive ? 1.5 : 1,
          },
          style,
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
          {badge !== undefined && badge !== 0 && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: palette.primary,
                  borderColor: palette.surface,
                },
              ]}
            >
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
      </NeumorphicBox>
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
    top: -8,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
