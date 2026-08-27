import { MD3DarkTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  fontFamily: 'System',
};

/**
 * MCL Season 4 brand palette (from official logo)
 */
export const colors = {
  forest: {
    950: '#030A05',
    900: '#071A0B',
    800: '#0A2410',
    700: '#0D3B1F',
    600: '#14532D',
    500: '#166534',
    400: '#22A04A',
  },
  lime: {
    300: '#C5E85A',
    400: '#B4DC3A',
    500: '#A3CF2D',
    600: '#8CC63F',
    700: '#6B9A22',
  },
  gold: {
    400: '#E0C15A',
    500: '#D4AF37',
    600: '#B8941F',
  },
  silver: {
    50: '#FFFFFF',
    100: '#F3F4F3',
    200: '#E5E7E5',
    300: '#C8CDC8',
    400: '#9CA39C',
  },
  status: {
    pending: '#F59E0B',
    approved: '#A3CF2D',
    rejected: '#EF4444',
    suspended: '#6B7280',
  },
  /**
   * Compat layer for older screens.
   * Mapped for dark premium UI (not light mint).
   */
  green: {
    50: '#0A2410',
    100: '#0D3B1F',
    200: '#14532D',
    300: '#22A04A',
    400: '#9CA39C',
    500: '#071A0B',
    600: '#0A2410',
    700: '#F3F4F3',
    800: '#071A0B',
    900: '#030A05',
  },
};

export const cricketTheme = {
  ...MD3DarkTheme,
  dark: true,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.lime[500],
    primaryContainer: colors.forest[700],
    secondary: colors.gold[500],
    secondaryContainer: colors.forest[800],
    tertiary: colors.lime[600],
    background: colors.forest[900],
    surface: colors.forest[800],
    surfaceVariant: colors.forest[700],
    onPrimary: colors.forest[950],
    onSecondary: colors.forest[950],
    onBackground: colors.silver[100],
    onSurface: colors.silver[100],
    outline: colors.forest[600],
    error: '#EF4444',
    elevation: {
      level0: 'transparent',
      level1: colors.forest[800],
      level2: colors.forest[700],
      level3: '#124528',
      level4: colors.forest[600],
      level5: '#1A5C32',
    },
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 16,
};
