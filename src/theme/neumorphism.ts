import { ViewStyle } from 'react-native';
import { NeumorphicPalette } from './colors';

export type NeumorphicDepth = 'flat' | 'low' | 'medium' | 'high';
export type NeumorphicState = 'elevated' | 'pressed' | 'inset';

export function getNeumorphicShadow(
  palette: NeumorphicPalette,
  depth: NeumorphicDepth = 'medium',
  state: NeumorphicState = 'elevated'
): ViewStyle {
  if (state === 'pressed' || state === 'inset') {
    return {
      backgroundColor: palette.surfacePressed,
      borderWidth: 1,
      borderColor: palette.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(184, 196, 212, 0.4)',
    };
  }

  const offsetMap = {
    flat: { width: 0, height: 0, radius: 0, elevation: 0 },
    low: { width: 2, height: 2, radius: 4, elevation: 2 },
    medium: { width: 4, height: 4, radius: 8, elevation: 5 },
    high: { width: 7, height: 7, radius: 14, elevation: 9 },
  };

  const config = offsetMap[depth];

  return {
    backgroundColor: palette.surfaceElevated,
    shadowColor: palette.shadowDark,
    shadowOffset: { width: config.width, height: config.height },
    shadowOpacity: palette.isDark ? 0.8 : 0.6,
    shadowRadius: config.radius,
    elevation: config.elevation,
    borderWidth: 1,
    borderColor: palette.surfaceBorder,
  };
}

export function getTopHighlightStyle(
  palette: NeumorphicPalette,
  depth: NeumorphicDepth = 'medium'
): ViewStyle {
  const offsetMap = {
    flat: { width: 0, height: 0, radius: 0 },
    low: { width: -2, height: -2, radius: 4 },
    medium: { width: -4, height: -4, radius: 8 },
    high: { width: -6, height: -6, radius: 12 },
  };

  const config = offsetMap[depth];

  return {
    shadowColor: palette.shadowLight,
    shadowOffset: { width: config.width, height: config.height },
    shadowOpacity: palette.isDark ? 0.35 : 0.9,
    shadowRadius: config.radius,
  };
}
