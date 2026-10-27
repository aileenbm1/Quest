export const palette = {
  night: '#111827',
  violet: '#7C3AED',
  cyan: '#22D3EE',
  light: '#F8FAFC',
  ink: '#172033',
};

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  accent: string;
  onAccent: string;
  border: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  tabBar: string;
}

export const lightColors: ThemeColors = {
  background: palette.light,
  surface: '#FFFFFF',
  surfaceAlt: '#EEF2FF',
  text: palette.ink,
  textMuted: '#526079',
  primary: palette.violet,
  onPrimary: '#FFFFFF',
  accent: palette.cyan,
  onAccent: palette.night,
  border: '#E2E8F0',
  success: '#15803D',
  successSoft: '#DCFCE7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  info: '#0E7490',
  infoSoft: '#CFFAFE',
  tabBar: '#FFFFFF',
};

export const darkColors: ThemeColors = {
  background: palette.night,
  surface: '#1C2536',
  surfaceAlt: '#262F45',
  text: '#F1F5F9',
  textMuted: '#A5B0C4',
  primary: '#8B5CF6',
  onPrimary: '#FFFFFF',
  accent: palette.cyan,
  onAccent: palette.night,
  border: '#334155',
  success: '#4ADE80',
  successSoft: '#14361F',
  danger: '#F87171',
  dangerSoft: '#3F1D1D',
  warning: '#FBBF24',
  warningSoft: '#3A2A0A',
  info: '#67E8F9',
  infoSoft: '#103540',
  tabBar: '#161E2E',
};

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
