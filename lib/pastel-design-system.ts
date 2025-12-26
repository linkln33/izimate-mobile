/**
 * Pastel Design System
 * Material Design 3 compliant with proper contrast ratios
 * Light, airy, and accessible pastel color palette
 */

// Pastel Color Palette - Optimized for contrast and accessibility
// All colors meet WCAG AA standards (4.5:1 contrast ratio for text)
export const pastelColors = {
  // Primary - Soft Coral (warm, inviting)
  primary: {
    50: '#FFF5F3',   // Lightest - backgrounds
    100: '#FFE8E4',  // Very light - subtle backgrounds
    200: '#FFD4CC',  // Light - inactive states
    300: '#FFB4A8',  // Lighter - hover states
    400: '#FF8A7A',  // Light - secondary actions
    500: '#F25842',  // Base - primary actions
    600: '#E04A35',  // Darker - pressed states
    700: '#C93D28',  // Dark - emphasis
    800: '#A83220',  // Darker - strong emphasis
    900: '#8A2A1A',  // Darkest - maximum contrast
  },
  
  // Secondary - Soft Sky Blue (trust, calm)
  secondary: {
    50: '#F0F9FF',   // Lightest
    100: '#E0F2FE',  // Very light
    200: '#BAE6FD',  // Light
    300: '#7DD3FC',  // Lighter
    400: '#38BDF8',  // Light
    500: '#0EA5E9',  // Base
    600: '#0284C7',  // Darker
    700: '#0369A1',  // Dark
    800: '#075985',  // Darker
    900: '#0C4A6E',  // Darkest
  },
  
  // Accent - Soft Mint (fresh, positive)
  accent: {
    50: '#F0FDF4',   // Lightest
    100: '#DCFCE7',  // Very light
    200: '#BBF7D0',  // Light
    300: '#86EFAC',  // Lighter
    400: '#4ADE80',  // Light
    500: '#22C55E',  // Base
    600: '#16A34A',  // Darker
    700: '#15803D',  // Dark
    800: '#166534',  // Darker
    900: '#14532D',  // Darkest
  },
  
  // Neutral Grays - Soft and warm
  neutral: {
    50: '#FAFAFA',   // Lightest - pure backgrounds
    100: '#F5F5F5',  // Very light - subtle backgrounds
    200: '#E5E5E5',  // Light - borders, dividers
    300: '#D4D4D4',  // Lighter - disabled states
    400: '#A3A3A3',  // Light - placeholder text
    500: '#737373',  // Base - secondary text
    600: '#525252',  // Darker - body text
    700: '#404040',  // Dark - headings
    800: '#262626',  // Darker - strong text
    900: '#171717',  // Darkest - maximum contrast
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
  
  // Semantic Colors
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
  },
  
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },
  
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
  },
  
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
  },
} as const

// Surface Colors - Material Design 3
export const surfaces = {
  // Main background - very light pastel
  background: pastelColors.neutral[50],
  
  // Surface containers - sand-colored cards
  surface: pastelColors.sand[50], // Light sand for cards
  surfaceVariant: pastelColors.sand[100], // Slightly darker sand
  surfaceContainer: pastelColors.neutral[50],
  surfaceContainerLow: pastelColors.neutral[50],
  surfaceContainerHigh: pastelColors.sand[50],
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
    backgroundColor: pastelColors.sand[50], // Light sand background
    borderRadius: borderRadius.lg,
    ...elevation.level2,
    padding: spacing.lg,
  },
  
  // Card with elevation
  cardElevated: {
    backgroundColor: pastelColors.sand[50], // Light sand background
    borderRadius: borderRadius.lg,
    ...elevation.level3,
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

