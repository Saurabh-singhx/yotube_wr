import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { NeumorphicBox } from './NeumorphicBox';

interface NeumorphicBadgeProps {
  label: string;
  count?: number | string;
  color?: string;
  variant?: 'elevated' | 'inset';
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  showDot?: boolean;
}

export const NeumorphicBadge: React.FC<NeumorphicBadgeProps> = ({
  label,
  count,
  color,
  variant = 'elevated',
  size = 'md',
  style,
  showDot = false,
}) => {
  const { palette } = useTheme();
  const activeColor = color || palette.accent;

  return (
    <NeumorphicBox
      state={variant === 'inset' ? 'inset' : 'elevated'}
      depth="low"
      borderRadius={12}
      style={[
        styles.badge,
        size === 'sm' ? styles.badgeSm : styles.badgeMd,
        style,
      ]}
    >
      <View style={styles.row}>
        {showDot && (
          <View
            style={[
              styles.dot,
              { backgroundColor: activeColor },
            ]}
          />
        )}
        <Text
          style={[
            styles.label,
            { color: palette.textPrimary },
            size === 'sm' && styles.labelSm,
          ]}
        >
          {label}
        </Text>
        {count !== undefined && (
          <View
            style={[
              styles.countContainer,
              { backgroundColor: activeColor },
            ]}
          >
            <Text style={styles.countText}>{count}</Text>
          </View>
        )}
      </View>
    </NeumorphicBox>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  badgeMd: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 10,
  },
  countContainer: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
