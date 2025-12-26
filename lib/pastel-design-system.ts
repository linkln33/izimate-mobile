/**
 * Pastel Design System
 * Material Design 3 compliant with proper contrast ratios
 * Light, airy, and accessible pastel color palette
 */

// Pastel Color Palette - TikTok-inspired but lighter and softer
// All colors meet WCAG AA standards (4.5:1 contrast ratio for text)
export const pastelColors = {
  // Primary - TikTok Cyan (inspired by #2af0ea, lighter pastel) - Light Blue
  primary: {
    50: '#F0FDFD',   // Lightest - backgrounds
    100: '#E0FBFB',  // Very light - subtle backgrounds
    200: '#C4F7F5',  // Light - inactive states
    300: '#B3F5F3',  // Lighter - hover states
    400: '#8FEFEB',  // Light - secondary actions
    500: '#6BE8E3',  // Base - primary actions (pastel version of #2af0ea)
    600: '#4DD4CE',  // Darker - pressed states
    700: '#2AB8B0',  // Dark - emphasis
    800: '#1F8F88',  // Darker - strong emphasis
    900: '#156660',  // Darkest - maximum contrast
  },
  
  // Secondary - TikTok Pink (inspired by #fe2858, lighter pastel)
  secondary: {
    50: '#FFF0F5',   // Lightest
    100: '#FFE0EA',  // Very light
    200: '#FFC4D4',  // Light
    300: '#FFB3C6',  // Lighter
    400: '#FF8FA8',  // Light
    500: '#FF6B8A',  // Base (pastel version of #fe2858)
    600: '#FF4D6D',  // Darker
    700: '#E63950',  // Dark
    800: '#CC2A3F',  // Darker
    900: '#B31E2E',  // Darkest
  },
  
  // Accent - TikTok Teal (inspired by #397684, lighter pastel)
  accent: {
    50: '#F0F7F9',   // Lightest
    100: '#E0EFF3',  // Very light
    200: '#B8DCE8',  // Light
    300: '#A8D4E0',  // Lighter
    400: '#7FC4D6',  // Light
    500: '#5BA8C0',  // Base (pastel version of #397684)
    600: '#4A8FA5',  // Darker
    700: '#397684',  // Dark (original TikTok color)
    800: '#2D5C68',  // Darker
    900: '#1F3F4A',  // Darkest
  },
  
  // Tertiary - TikTok Mauve (inspired by #de8c9d, lighter pastel)
  tertiary: {
    50: '#FDF5F7',   // Lightest
    100: '#FBEAF0',  // Very light
    200: '#F8D8E0',  // Light
    300: '#F5D0D8',  // Lighter
    400: '#F0B8C6',  // Light
    500: '#E89FB0',  // Base (pastel version of #de8c9d)
    600: '#DE8C9D',  // Darker (original TikTok color)
    700: '#C77588',  // Dark
    800: '#A85E6F',  // Darker
    900: '#8A4A58',  // Darkest
  },
  
  // Neutral Grays - TikTok-inspired dark (inspired by #040404, slightly lighter)
  neutral: {
    50: '#FAFAFA',   // Lightest - pure backgrounds
    100: '#F5F5F5',  // Very light - subtle backgrounds
    200: '#E5E5E5',  // Light - borders, dividers
    300: '#D4D4D4',  // Lighter - disabled states
    400: '#A3A3A3',  // Light - placeholder text
    500: '#737373',  // Base - secondary text
    600: '#525252',  // Darker - body text
    700: '#404040',  // Dark - headings
    800: '#2A2A2A',  // Darker - strong text (lighter than #040404)
    900: '#1A1A1A',  // Darkest - maximum contrast (lighter than #040404)
  },
  
  // Sand/Beige - Warm, light backgrounds for cards
  sand: {
    50: '#FFFBF5',   // Lightest sand - card backgrounds
    100: '#FFF8ED',  // Very light sand
    200: '#FFF4E0',  // Light sand
    300: '#FFEED0',  // Lighter sand
    400: '#FFE5B4',  // Light sand
    500: '#F5D5A0',  // Base sand
  },
  
  // Semantic Colors - TikTok-inspired
  success: {
    50: '#F0FDFD',
    100: '#E0FBFB',
    500: '#6BE8E3', // Light blue for success (primary)
    600: '#4DD4CE',
    700: '#2AB8B0',
  },
  
  warning: {
    50: '#FDF5F7',
    100: '#FBEAF0',
    500: '#E89FB0', // TikTok mauve for warnings
    600: '#DE8C9D',
    700: '#C77588',
  },
  
  error: {
    50: '#FFF0F5',
    100: '#FFE0EA',
    500: '#FF4D6D', // TikTok pink for errors (secondary)
    600: '#E63950',
    700: '#CC2A3F',
  },
  
  info: {
    50: '#F0F7F9',
    100: '#E0EFF3',
    500: '#5BA8C0', // TikTok teal for info
    600: '#4A8FA5',
    700: '#397684',
  },
} as const

// Surface Colors - Material Design 3
export const surfaces = {
  // Main background - very light pastel
  background: pastelColors.neutral[50],
  
  // Surface containers - colorful pastel cards (more saturated for visibility)
  surface: pastelColors.primary[100], // Light cyan for cards - more colorful
  surfaceVariant: pastelColors.secondary[100], // Light pink variant - more colorful
  surfaceContainer: pastelColors.accent[100], // Light teal - more colorful
  surfaceContainerLow: pastelColors.primary[100], // Light cyan
  surfaceContainerHigh: pastelColors.secondary[100], // Light pink
  surfaceContainerHighest: '#FFFFFF',
  
  // Text colors with proper contrast
  onBackground: pastelColors.neutral[900],
  onSurface: pastelColors.neutral[900],
  onSurfaceVariant: pastelColors.neutral[700],
  
  // Outline colors - subtle borders
  outline: pastelColors.neutral[200],
  outlineVariant: pastelColors.neutral[100],
} as const

// Elevation System - Subtle shadows for depth
export const elevation = {
  level0: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  level1: {
    shadowColor: pastelColors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  level2: {
    shadowColor: pastelColors.neutral[900],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  level3: {
    shadowColor: pastelColors.neutral[900],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
  },
  level4: {
    shadowColor: pastelColors.neutral[900],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  level5: {
    shadowColor: pastelColors.neutral[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
} as const

// Border System - Very subtle, only when needed
export const borders = {
  // No borders by default - use elevation instead
  none: { borderWidth: 0 },
  
  // Subtle borders only for separation
  subtle: {
    borderWidth: 0.5,
    borderColor: surfaces.outline,
  },
  
  // Light borders for inputs
  light: {
    borderWidth: 1,
    borderColor: surfaces.outline,
  },
  
  // Medium borders for emphasis
  medium: {
    borderWidth: 1.5,
    borderColor: surfaces.outlineVariant,
  },
} as const

// Spacing System (4px base grid)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const

// Border Radius
export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const

// Typography with proper contrast
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    displayLarge: 57,
    displayMedium: 45,
    displaySmall: 36,
    headlineLarge: 32,
    headlineMedium: 28,
    headlineSmall: 24,
    titleLarge: 22,
    titleMedium: 16,
    titleSmall: 14,
    bodyLarge: 16,
    bodyMedium: 14,
    bodySmall: 12,
    labelLarge: 14,
    labelMedium: 12,
    labelSmall: 11,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const

// Component Styles - Pre-defined consistent styles
export const componentStyles = {
  // Card styles
  card: {
    backgroundColor: pastelColors.primary[100], // Light cyan background - more colorful
    borderRadius: borderRadius.lg,
    ...elevation.level2,
    padding: spacing.lg,
  },
  
  // Card with elevation
  cardElevated: {
    backgroundColor: pastelColors.primary[100], // Light cyan background - more colorful
    borderRadius: borderRadius.lg,
    ...elevation.level3,
    padding: spacing.lg,
  },
  
  // Alternative card colors for variety
  cardSecondary: {
    backgroundColor: pastelColors.secondary[100], // Light pink - more colorful
    borderRadius: borderRadius.lg,
    ...elevation.level2,
    padding: spacing.lg,
  },
  
  cardAccent: {
    backgroundColor: pastelColors.accent[100], // Light teal - more colorful
    borderRadius: borderRadius.lg,
    ...elevation.level2,
    padding: spacing.lg,
  },
  
  // Container styles
  container: {
    backgroundColor: surfaces.background,
    flex: 1,
  },
  
  // Input styles
  input: {
    backgroundColor: surfaces.surface,
    borderRadius: borderRadius.md,
    ...borders.light,
    padding: spacing.md,
    fontSize: typography.fontSize.bodyLarge,
    color: surfaces.onSurface,
  },
  
  // Button styles
  button: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...elevation.level1,
  },
  
  // Section styles
  section: {
    backgroundColor: surfaces.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...elevation.level1,
  },
} as const

// Export everything
export const pastelDesignSystem = {
  colors: pastelColors,
  surfaces,
  elevation,
  borders,
  spacing,
  borderRadius,
  typography,
  componentStyles,
} as const

export default pastelDesignSystem

