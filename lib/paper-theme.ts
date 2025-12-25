/**
 * React Native Paper Theme Configuration
 * Material Design 3 compliant theme using our design system
 */

import { MD3LightTheme } from 'react-native-paper'
import { colors, borderRadius, typography } from './design-system'

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    // Primary colors
    primary: colors.primary,
    onPrimary: colors.onPrimary,
    primaryContainer: colors.primaryContainer,
    onPrimaryContainer: colors.onPrimaryContainer,
    
    // Secondary colors
    secondary: colors.secondary,
    onSecondary: colors.onSecondary,
    secondaryContainer: colors.secondaryContainer,
    onSecondaryContainer: colors.onSecondaryContainer,
    
    // Tertiary colors
    tertiary: colors.tertiary,
    onTertiary: colors.onTertiary,
    tertiaryContainer: colors.tertiaryContainer,
    onTertiaryContainer: colors.onTertiaryContainer,
    
    // Error colors
    error: colors.error,
    onError: colors.onError,
    errorContainer: colors.errorContainer,
    onErrorContainer: colors.onErrorContainer,
    
    // Surface colors
    surface: colors.surface,
    onSurface: colors.onSurface,
    surfaceVariant: colors.surfaceVariant,
    onSurfaceVariant: colors.onSurfaceVariant,
    
    // Background colors
    background: colors.background,
    onBackground: colors.onBackground,
    
    // Outline
    outline: colors.outline,
    outlineVariant: colors.outlineVariant,
    
    // Shadow
    shadow: colors.shadow,
    scrim: colors.scrim,
    
    // Inverse
    inverseSurface: colors.inverseSurface,
    inverseOnSurface: colors.inverseOnSurface,
    inversePrimary: colors.inversePrimary,
  },
  roundness: borderRadius.md, // 12px - Material Design 3 standard
} as const

