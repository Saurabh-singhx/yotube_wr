import React from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  TextInputProps,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { NeumorphicBox } from './NeumorphicBox';

interface NeumorphicInputProps extends TextInputProps {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClear?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export const NeumorphicInput: React.FC<NeumorphicInputProps> = ({
  leftIcon,
  rightIcon,
  onClear,
  value,
  containerStyle,
  style,
  placeholderTextColor,
  ...props
}) => {
  const { palette } = useTheme();

  return (
    <NeumorphicBox
      state="inset"
      borderRadius={16}
      style={[styles.container, containerStyle]}
    >
      <View style={styles.contentRow}>
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
        <TextInput
          value={value}
          placeholderTextColor={placeholderTextColor || palette.textMuted}
          style={[
            styles.input,
            {
              color: palette.textPrimary,
            },
            style,
          ]}
          {...props}
        />
        {onClear && !!value && (
          <Pressable onPress={onClear} style={styles.clearBtn} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={palette.textMuted} />
          </Pressable>
        )}
        {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
      </View>
    </NeumorphicBox>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    minHeight: 46,
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIconContainer: {
    marginRight: 8,
  },
  rightIconContainer: {
    marginLeft: 8,
  },
  clearBtn: {
    padding: 4,
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
});
