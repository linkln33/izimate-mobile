/**
 * Material Design 3 Design System
 * Industry-standard design tokens for service booking apps
 * Based on Google Material Design 3 guidelines
 */

// Enhanced Color System - Modern Service Booking App Style
// Based on research: Airbnb (coral), TaskRabbit (trust blue), modern marketplace apps
export const colors = {
  // Primary Brand Colors - Warm Coral (Airbnb-inspired, builds trust)
  primary: '#f25842',
  primaryLight: '#ff8a7a',
  primaryDark: '#e04a35',
  primary50: '#fff5f3',
  primary100: '#ffe8e4',
  primary200: '#ffd4cc',
  primary300: '#ffb4a8',
  primary400: '#ff8a7a',
  primary500: '#f25842',
  primary600: '#e04a35',
  primary700: '#c93d28',
  primary800: '#a83220',
  primary900: '#8a2a1a',
  onPrimary: '#ffffff',
  primaryContainer: '#ffdad6',
  onPrimaryContainer: '#410002',
  
  // Secondary Colors - Trust Blue (Professional, reliable)
  secondary: '#4285F4',
  secondaryLight: '#60a5fa',
  secondaryDark: '#2563eb',
  secondary50: '#eff6ff',
  secondary100: '#dbeafe',
  secondary200: '#bfdbfe',
  secondary300: '#93c5fd',
  secondary400: '#60a5fa',
  secondary500: '#4285F4',
  secondary600: '#2563eb',
  secondary700: '#1d4ed8',
  secondary800: '#1e40af',
  secondary900: '#1e3a8a',
  onSecondary: '#ffffff',
  secondaryContainer: '#dbeafe',
  onSecondaryContainer: '#001e3c',
  
  // Tertiary Colors - Fresh Green (Positive actions)
  tertiary: '#10b981',
  tertiaryLight: '#4ade80',
  tertiaryDark: '#059669',
  tertiary50: '#f0fdf4',
  tertiary100: '#dcfce7',
  tertiary200: '#bbf7d0',
  tertiary300: '#86efac',
  tertiary400: '#4ade80',
  tertiary500: '#10b981',
  tertiary600: '#059669',
  tertiary700: '#047857',
  tertiary800: '#065f46',
  tertiary900: '#064e3b',
  onTertiary: '#ffffff',
  tertiaryContainer: '#d1fae5',
  onTertiaryContainer: '#002114',
  
  // Error Colors
  error: '#ef4444',
  errorLight: '#f87171',
  errorDark: '#dc2626',
  onError: '#ffffff',
  errorContainer: '#fee2e2',
  onErrorContainer: '#7f1d1d',
  
  // Success Colors
  success: '#10b981',
  successLight: '#4ade80',
  successDark: '#059669',
  onSuccess: '#ffffff',
  successContainer: '#d1fae5',
  onSuccessContainer: '#064e3b',
  
  // Warning Colors
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  warningDark: '#d97706',
  onWarning: '#ffffff',
  warningContainer: '#fef3c7',
  onWarningContainer: '#78350f',
  
  // Info Colors
  info: '#4285F4',
  infoLight: '#60a5fa',
  infoDark: '#2563eb',
  onInfo: '#ffffff',
  infoContainer: '#dbeafe',
  onInfoContainer: '#001e3c',
  
  // Surface Colors (Material Design 3)
  surface: '#ffffff',
  surfaceVariant: '#f9fafb',
  surfaceContainer: '#f3f4f6',
  surfaceContainerHigh: '#ffffff',
  surfaceContainerHighest: '#ffffff',
  surfaceContainerLow: '#fafbfc',
  onSurface: '#111827',
  onSurfaceVariant: '#6b7280',
  
  // Background Colors
  background: '#ffffff',
  backgroundSecondary: '#f9fafb',
  backgroundTertiary: '#f3f4f6',
  onBackground: '#111827',
  
  // Text Colors (Enhanced hierarchy)
  text: {
    primary: '#111827',
    secondary: '#4b5563',
    tertiary: '#6b7280',
    disabled: '#9ca3af',
    inverse: '#ffffff',
    link: '#4285F4',
    linkHover: '#2563eb',
  },
  
  // Border Colors
  border: {
    light: '#e5e7eb',
    default: '#d1d5db',
    dark: '#9ca3af',
    focus: '#4285F4',
  },
  
  // Status Colors (for bookings, listings)
  status: {
    pending: '#f59e0b',
    confirmed: '#10b981',
    completed: '#6366f1',
    cancelled: '#ef4444',
    noShow: '#6b7280',
  },
  
  // Outline Colors
  outline: '#d1d5db',
  outlineVariant: '#e5e7eb',
  
  // Shadow Colors
  shadow: '#000000',
  scrim: '#000000',
  
  // Overlay Colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.1)',
  overlayMedium: 'rgba(0, 0, 0, 0.3)',
  overlayWhite: 'rgba(255, 255, 255, 0.9)',
  
  // Inverse Colors
  inverseSurface: '#1f2937',
  inverseOnSurface: '#ffffff',
  inversePrimary: '#ff6b55',
  
  // Gray Scale (for consistent neutrals)
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
} as const

// Modern Gradient Presets (for polished, professional look)
export const gradients = {
  // Primary Gradients
  primary: ['#f25842', '#ff6b55', '#ff8a7a'],
  primaryDark: ['#e04a35', '#f25842', '#ff6b55'],
  primaryLight: ['#ff8a7a', '#ffb4a8', '#ffd4cc'],
  
  // Secondary Gradients
  secondary: ['#4285F4', '#60a5fa', '#93c5fd'],
  secondaryDark: ['#2563eb', '#4285F4', '#60a5fa'],
  
  // Success Gradients
  success: ['#10b981', '#4ade80', '#86efac'],
  
  // Warm Gradients (for hero sections, CTAs)
  warm: ['#f25842', '#ff8a7a', '#ffb4a8'],
  warmSunset: ['#f25842', '#f59e0b', '#fbbf24'],
  
  // Cool Gradients (for professional sections)
  cool: ['#4285F4', '#6366f1', '#8b5cf6'],
  
  // Neutral Gradients
  neutral: ['#f9fafb', '#f3f4f6', '#e5e7eb'],
  neutralDark: ['#374151', '#4b5563', '#6b7280'],
  
  // Overlay Gradients
  overlayLight: ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)'],
  overlayDark: ['rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.4)'],
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
  gradients,
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

