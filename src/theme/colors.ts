export interface NeumorphicPalette {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceElevated: string;
  surfacePressed: string;
  surfaceBorder: string;
  
  // Shadows
  shadowLight: string;
  shadowDark: string;
  
  // Accent colors
  primary: string; // YouTube red
  primaryLight: string;
  primaryDark: string;
  accent: string; // Cyan / Electric blue for extensions
  accentLight: string;
  success: string; // Emerald for active shields
  warning: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  // Input / Track colors
  trackBackground: string;
  inputBackground: string;
}

export const lightPalette: NeumorphicPalette = {
  isDark: false,
  background: '#E6EBF2',
  surface: '#E6EBF2',
  surfaceElevated: '#EFF3F8',
  surfacePressed: '#DCE2EC',
  surfaceBorder: 'rgba(255, 255, 255, 0.7)',

  shadowLight: '#FFFFFF',
  shadowDark: '#B8C4D4',

  primary: '#FF0033',
  primaryLight: '#FF3358',
  primaryDark: '#D60029',
  accent: '#0084FF',
  accentLight: '#339DFF',
  success: '#00B894',
  warning: '#F39C12',

  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',

  trackBackground: '#D7DEE9',
  inputBackground: '#DEE4EE',
};

export const darkPalette: NeumorphicPalette = {
  isDark: true,
  background: '#181A20',
  surface: '#181A20',
  surfaceElevated: '#1F232B',
  surfacePressed: '#121418',
  surfaceBorder: 'rgba(255, 255, 255, 0.05)',

  shadowLight: '#262A34',
  shadowDark: '#0E0F13',

  primary: '#FF2A4D',
  primaryLight: '#FF4D6D',
  primaryDark: '#D60029',
  accent: '#00D2D3',
  accentLight: '#48DBFB',
  success: '#10B981',
  warning: '#F59E0B',

  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  trackBackground: '#13151A',
  inputBackground: '#14161C',
};
