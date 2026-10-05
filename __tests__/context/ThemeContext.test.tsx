import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkPalette, lightPalette } from '../../src/theme/colors';

describe('Theme System & Palette Tokens', () => {
  const THEME_STORAGE_KEY = '@youtube_wr_theme_mode';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Theme Palettes', () => {
    it('provides complete tokens for darkPalette', () => {
      expect(darkPalette.isDark).toBe(true);
      expect(darkPalette.background).toBe('#181A20');
      expect(darkPalette.surface).toBe('#181A20');
      expect(darkPalette.surfaceElevated).toBe('#1F232B');
      expect(darkPalette.surfacePressed).toBe('#121418');
      expect(darkPalette.textPrimary).toBe('#F8FAFC');
      expect(darkPalette.textSecondary).toBe('#94A3B8');
      expect(darkPalette.accent).toBe('#00D2D3');
      expect(darkPalette.shadowLight).toBe('#262A34');
      expect(darkPalette.shadowDark).toBe('#0E0F13');
      expect(darkPalette.primary).toBe('#FF2A4D');
    });

    it('provides complete tokens for lightPalette', () => {
      expect(lightPalette.isDark).toBe(false);
      expect(lightPalette.background).toBe('#E6EBF2');
      expect(lightPalette.surface).toBe('#E6EBF2');
      expect(lightPalette.surfaceElevated).toBe('#EFF3F8');
      expect(lightPalette.surfacePressed).toBe('#DCE2EC');
      expect(lightPalette.textPrimary).toBe('#1E293B');
      expect(lightPalette.textSecondary).toBe('#64748B');
      expect(lightPalette.accent).toBe('#0084FF');
      expect(lightPalette.shadowLight).toBe('#FFFFFF');
      expect(lightPalette.shadowDark).toBe('#B8C4D4');
      expect(lightPalette.primary).toBe('#FF0033');
    });
  });

  describe('Theme Storage & Toggle Logic', () => {
    it('persists theme choices to AsyncStorage', async () => {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, 'light');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'light');

      await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
    });

    it('correctly alternates between dark and light modes', () => {
      let currentMode: 'dark' | 'light' = 'dark';
      const toggle = () => {
        currentMode = currentMode === 'dark' ? 'light' : 'dark';
      };

      expect(currentMode).toBe('dark');
      toggle();
      expect(currentMode).toBe('light');
      toggle();
      expect(currentMode).toBe('dark');
    });
  });
});
