/**
 * Enhanced Design System for Service Booking App
 * Based on modern service marketplace apps (Airbnb, TaskRabbit, Handy)
 * 
 * Key Principles:
 * - Trust-building colors (blues, greens)
 * - Warm, inviting accents (coral, peach)
 * - Clean minimalism with strategic color use
 * - Professional yet approachable
 */

// Enhanced Color Palette - Modern Service Booking App Style
export const enhancedColors = {
  // Primary Brand - Warm Coral (Airbnb-inspired, builds trust)
  primary: {
    50: '#fff5f3',
    100: '#ffe8e4',
    200: '#ffd4cc',
    300: '#ffb4a8',
    400: '#ff8a7a',
    500: '#f25842', // Main brand color
    600: '#e04a35',
    700: '#c93d28',
    800: '#a83220',
    900: '#8a2a1a',
  },
  
  // Secondary - Trust Blue (Professional, reliable)
  secondary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#4285F4', // Main secondary
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Success - Fresh Green (Positive actions, confirmations)
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#10b981', // Main success
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  
  // Warning - Warm Amber (Attention, pending states)
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // Main warning
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  // Error - Clear Red (Errors, cancellations)
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Main error
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // Neutral Grays - Professional base
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
  
  // Semantic Colors (for quick access)
  brand: '#f25842',
  brandLight: '#ff8a7a',
  brandDark: '#e04a35',
  
  trust: '#4285F4',
  trustLight: '#60a5fa',
  trustDark: '#2563eb',
  
  positive: '#10b981',
  positiveLight: '#4ade80',
  positiveDark: '#059669',
  
  // Background Colors
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
    elevated: '#ffffff',
  },
  
  // Text Colors
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
  
  // Status Colors (for bookings, listings, etc.)
  status: {
    pending: '#f59e0b',
    confirmed: '#10b981',
    completed: '#6366f1',
    cancelled: '#ef4444',
    noShow: '#6b7280',
  },
  
  // Overlay Colors
  overlay: {
    dark: 'rgba(0, 0, 0, 0.5)',
    medium: 'rgba(0, 0, 0, 0.3)',
    light: 'rgba(0, 0, 0, 0.1)',
    white: 'rgba(255, 255, 255, 0.9)',
  },
} as const

// Gradient Presets (for modern, polished look)
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
  
  // Overlay Gradients (for cards, modals)
  overlayLight: ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)'],
  overlayDark: ['rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.4)'],
} as const

// Shadow Presets (for depth and hierarchy)
export const shadows = {
  // Subtle shadows (cards, inputs)
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  // Default shadows (elevated cards)
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Large shadows (modals, dropdowns)
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Extra large (floating elements)
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  
  // Colored shadows (for brand elements)
  primary: {
    shadowColor: '#f25842',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  success: {
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
} as const

// Typography Enhancements
export const enhancedTypography = {
  // Display (Hero text, landing pages)
  display: {
    large: {
      fontSize: 57,
      lineHeight: 64,
      fontWeight: '700' as const,
      letterSpacing: -0.5,
    },
    medium: {
      fontSize: 45,
      lineHeight: 52,
      fontWeight: '700' as const,
      letterSpacing: -0.25,
    },
    small: {
      fontSize: 36,
      lineHeight: 44,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
  },
  
  // Headlines (Section titles)
  headline: {
    large: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    medium: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    small: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
  },
  
  // Titles (Card titles, buttons)
  title: {
    large: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    medium: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600' as const,
      letterSpacing: 0.15,
    },
    small: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600' as const,
      letterSpacing: 0.1,
    },
  },
  
  // Body (Content text)
  body: {
    large: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400' as const,
      letterSpacing: 0.15,
    },
    medium: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400' as const,
      letterSpacing: 0.25,
    },
    small: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400' as const,
      letterSpacing: 0.4,
    },
  },
  
  // Labels (Form labels, captions)
  label: {
    large: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500' as const,
      letterSpacing: 0.1,
    },
    medium: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500' as const,
      letterSpacing: 0.5,
    },
    small: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '500' as const,
      letterSpacing: 0.5,
    },
  },
} as const

// Spacing System (4px base grid - consistent with Material Design)
export const spacing = {
  none: 0,
  xxs: 2,
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
  '7xl': 80,
  '8xl': 96,
} as const

// Border Radius (Modern, rounded corners)
export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const

// Component Sizes (Touch-friendly, accessible)
export const componentSizes = {
  touchTarget: {
    minimum: 44, // iOS minimum
    standard: 48, // Material Design standard
    comfortable: 56, // Thumb-friendly
  },
  button: {
    small: 32,
    medium: 40,
    large: 56,
  },
  input: {
    height: 56,
    padding: 16,
  },
  icon: {
    small: 16,
    medium: 24,
    large: 32,
    xlarge: 48,
  },
} as const

// Animation Durations (Smooth, responsive)
export const animations = {
  fast: 150,
  normal: 250,
  slow: 350,
  verySlow: 500,
} as const

// Z-Index Layers (Proper stacking)
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const

// Export everything
export const enhancedDesignSystem = {
  colors: enhancedColors,
  gradients,
  shadows,
  typography: enhancedTypography,
  spacing,
  borderRadius,
  componentSizes,
  animations,
  zIndex,
} as const

