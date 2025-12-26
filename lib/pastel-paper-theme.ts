/**
 * React Native Paper Theme - Pastel Design System
 * Material Design 3 compliant with proper contrast
 */

import { MD3LightTheme } from 'react-native-paper'
import { pastelColors, surfaces, borderRadius } from './pastel-design-system'

export const pastelPaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    
    // Primary colors - Light Blue (TikTok Cyan) for buttons
    primary: pastelColors.primary[500], // #6BE8E3 - Light blue pastel
    onPrimary: '#FFFFFF',
    primaryContainer: pastelColors.primary[100],
    onPrimaryContainer: pastelColors.primary[900],
    
    // Secondary colors
    secondary: pastelColors.secondary[500],
    onSecondary: '#FFFFFF',
    secondaryContainer: pastelColors.secondary[100],
    onSecondaryContainer: pastelColors.secondary[900],
    
    // Tertiary colors
    tertiary: pastelColors.accent[500],
    onTertiary: '#FFFFFF',
    tertiaryContainer: pastelColors.accent[100],
    onTertiaryContainer: pastelColors.accent[900],
    
    // Error colors
    error: pastelColors.error[500],
    onError: '#FFFFFF',
    errorContainer: pastelColors.error[100],
    onErrorContainer: pastelColors.error[700],
    
    // Success colors
    success: pastelColors.success[500],
    onSuccess: '#FFFFFF',
    successContainer: pastelColors.success[100],
    onSuccessContainer: pastelColors.success[700],
    
    // Warning colors
    warning: pastelColors.warning[500],
    onWarning: '#FFFFFF',
    warningContainer: pastelColors.warning[100],
    onWarningContainer: pastelColors.warning[700],
    
    // Info colors
    info: pastelColors.info[500],
    onInfo: '#FFFFFF',
    infoContainer: pastelColors.info[100],
    onInfoContainer: pastelColors.info[700],
    
    // Surface colors
    surface: surfaces.surface,
    onSurface: surfaces.onSurface,
    surfaceVariant: surfaces.surfaceVariant,
    onSurfaceVariant: surfaces.onSurfaceVariant,
    surfaceContainer: surfaces.surfaceContainer,
    surfaceContainerLow: surfaces.surfaceContainerLow,
    surfaceContainerHigh: surfaces.surfaceContainerHigh,
    surfaceContainerHighest: surfaces.surfaceContainerHighest,
    
    // Background colors
    background: surfaces.background,
    onBackground: surfaces.onBackground,
    
    // Outline colors
    outline: surfaces.outline,
    outlineVariant: surfaces.outlineVariant,
    
    // Shadow
    shadow: pastelColors.neutral[900],
    scrim: 'rgba(0, 0, 0, 0.32)',
    
    // Inverse
    inverseSurface: pastelColors.neutral[800],
    inverseOnSurface: '#FFFFFF',
    inversePrimary: pastelColors.primary[300],
  },
  roundness: borderRadius.md, // 12px
} as const

