/**
 * Material Design 3 Design System
 * Industry-standard design tokens for service booking apps
 * Based on Google Material Design 3 guidelines
 */

// Material Design 3 Color System
export const colors = {
  // Primary Brand Colors (Material Design 3)
  primary: '#f25842',
  onPrimary: '#ffffff',
  primaryContainer: '#ffdad6',
  onPrimaryContainer: '#410002',
  
  // Secondary Colors
  secondary: '#4285F4',
  onSecondary: '#ffffff',
  secondaryContainer: '#dbeafe',
  onSecondaryContainer: '#001e3c',
  
  // Tertiary Colors
  tertiary: '#10b981',
  onTertiary: '#ffffff',
  tertiaryContainer: '#d1fae5',
  onTertiaryContainer: '#002114',
  
  // Error Colors (Material Design 3)
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#410002',
  
  // Success Colors
  success: '#10b981',
  onSuccess: '#ffffff',
  successContainer: '#d1fae5',
  onSuccessContainer: '#002114',
  
  // Warning Colors
  warning: '#f59e0b',
  onWarning: '#ffffff',
  warningContainer: '#fef3c7',
  onWarningContainer: '#78350f',
  
  // Info Colors
  info: '#3b82f6',
  onInfo: '#ffffff',
  infoContainer: '#dbeafe',
  onInfoContainer: '#001e3c',
  
  // Surface Colors (Material Design 3)
  surface: '#ffffff',
  onSurface: '#1a1a1a',
  surfaceVariant: '#f3f4f6',
  onSurfaceVariant: '#6b7280',
  
  // Background Colors
  background: '#ffffff',
  onBackground: '#1a1a1a',
  
  // Outline Colors
  outline: '#d1d5db',
  outlineVariant: '#e5e7eb',
  
  // Shadow Colors
  shadow: '#000000',
  scrim: '#000000',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.1)',
  
  // Inverse Colors
  inverseSurface: '#1a1a1a',
  inverseOnSurface: '#ffffff',
  inversePrimary: '#ff6b55',
} as const

// Material Design 3 Spacing System (4px base grid)
export const spacing = {
  // Base unit: 4px
  xs: 4,      // 4px
  sm: 8,      // 8px
  md: 12,     // 12px
  lg: 16,     // 16px
  xl: 20,     // 20px
  '2xl': 24,  // 24px
  '3xl': 32,  // 32px
  '4xl': 40,  // 40px
  '5xl': 48,  // 48px
  '6xl': 64,  // 64px
} as const

// Material Design 3 Typography Scale
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    // Material Design 3 Type Scale
    displayLarge: 57,    // 57px - Hero text
    displayMedium: 45,   // 45px - Large headlines
    displaySmall: 36,    // 36px - Headlines
    headlineLarge: 32,   // 32px - Section headers
    headlineMedium: 28,  // 28px - Subsection headers
    headlineSmall: 24,   // 24px - Card titles
    titleLarge: 22,       // 22px - Important text
    titleMedium: 16,      // 16px - Button text, labels
    titleSmall: 14,       // 14px - Secondary labels
    bodyLarge: 16,        // 16px - Body text
    bodyMedium: 14,       // 14px - Secondary body
    bodySmall: 12,        // 12px - Captions
    labelLarge: 14,       // 14px - Button labels
    labelMedium: 12,      // 12px - Small labels
    labelSmall: 11,       // 11px - Tiny labels
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
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
} as const

// Material Design 3 Border Radius
export const borderRadius = {
  none: 0,
  xs: 4,      // 4px - Small elements
  sm: 8,      // 8px - Buttons, inputs
  md: 12,     // 12px - Cards, modals
  lg: 16,     // 16px - Large cards
  xl: 24,     // 24px - Extra large
  full: 9999, // Full circle
} as const

// Material Design 3 Elevation (Shadows)
export const elevation = {
  level0: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  level1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  level2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  level3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  level4: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  level5: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 12,
  },
} as const

// Material Design 3 Component Sizes
export const componentSizes = {
  // Touch Targets (Material Design: minimum 48x48dp = 48x48pt)
  touchTarget: {
    minimum: 44,  // iOS minimum
    standard: 48, // Material Design standard
    comfortable: 56, // Comfortable for thumb
  },
  // Button Heights
  button: {
    small: 32,
    medium: 40,
    large: 48,
  },
  // Icon Sizes
  icon: {
    small: 16,
    medium: 24,
    large: 32,
    xlarge: 48,
  },
  // Avatar Sizes
  avatar: {
    small: 32,
    medium: 40,
    large: 56,
    xlarge: 96,
  },
} as const

// Material Design 3 Animation Durations
export const animations = {
  duration: {
    short1: 50,      // 50ms - Micro-interactions
    short2: 100,     // 100ms - Small transitions
    short3: 150,     // 150ms - Button presses
    short4: 200,     // 200ms - Card interactions
    medium1: 250,    // 250ms - Standard transitions
    medium2: 300,    // 300ms - Page transitions
    medium3: 350,    // 350ms - Modal animations
    medium4: 400,    // 400ms - Complex animations
    long1: 450,      // 450ms - Long transitions
    long2: 500,      // 500ms - Extended animations
    long3: 700,      // 700ms - Very long
    long4: 1000,     // 1000ms - Extra long
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
} as const

// Z-index Scale (Material Design 3)
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  snackbar: 1080,
} as const

// Material Design 3 Breakpoints (for responsive design)
export const breakpoints = {
  xs: 0,      // Extra small devices
  sm: 600,    // Small devices
  md: 960,    // Medium devices
  lg: 1280,   // Large devices
  xl: 1920,   // Extra large devices
} as const

// Export all as a single design system object
export const designSystem = {
  colors,
  spacing,
  typography,
  borderRadius,
  elevation,
  componentSizes,
  animations,
  zIndex,
  breakpoints,
} as const

// Type exports
export type DesignSystem = typeof designSystem
export type DesignColors = typeof colors
export type DesignSpacing = typeof spacing
export type DesignTypography = typeof typography

