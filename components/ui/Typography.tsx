/**
 * Material Design 3 Typography Components
 * Industry-standard text components with proper hierarchy
 */

import React from 'react'
import { Text, StyleSheet, TextStyle } from 'react-native'
import { colors, typography } from '@/lib/design-system'

interface TypographyProps {
  variant?:
    | 'displayLarge'
    | 'displayMedium'
    | 'displaySmall'
    | 'headlineLarge'
    | 'headlineMedium'
    | 'headlineSmall'
    | 'titleLarge'
    | 'titleMedium'
    | 'titleSmall'
    | 'bodyLarge'
    | 'bodyMedium'
    | 'bodySmall'
    | 'labelLarge'
    | 'labelMedium'
    | 'labelSmall'
  color?: 'primary' | 'secondary' | 'onSurface' | 'onSurfaceVariant' | 'error' | 'success'
  style?: TextStyle
  children: React.ReactNode
}

export function Typography({
  variant = 'bodyLarge',
  color = 'onSurface',
  style,
  children,
  ...props
}: TypographyProps) {
  const getColor = () => {
    switch (color) {
      case 'primary':
        return colors.primary
      case 'secondary':
        return colors.secondary
      case 'onSurface':
        return colors.onSurface
      case 'onSurfaceVariant':
        return colors.onSurfaceVariant
      case 'error':
        return colors.error
      case 'success':
        return colors.success
      default:
        return colors.onSurface
    }
  }

  const getStyles = () => {
    const baseStyle = {
      fontSize: typography.fontSize[variant],
      color: getColor(),
      lineHeight: typography.fontSize[variant] * typography.lineHeight.normal,
    }

    // Add font weight based on variant
    switch (variant) {
      case 'displayLarge':
      case 'displayMedium':
      case 'displaySmall':
      case 'headlineLarge':
      case 'headlineMedium':
      case 'headlineSmall':
        return {
          ...baseStyle,
          fontWeight: typography.fontWeight.bold,
        }
      case 'titleLarge':
      case 'titleMedium':
        return {
          ...baseStyle,
          fontWeight: typography.fontWeight.semibold,
        }
      case 'titleSmall':
      case 'labelLarge':
      case 'labelMedium':
        return {
          ...baseStyle,
          fontWeight: typography.fontWeight.medium,
        }
      default:
        return {
          ...baseStyle,
          fontWeight: typography.fontWeight.regular,
        }
    }
  }

  return (
    <Text style={[getStyles(), style]} {...props}>
      {children}
    </Text>
  )
}

// Convenience components
export function DisplayLarge({ children, ...props }: Omit<TypographyProps, 'variant'>) {
  return <Typography variant="displayLarge" {...props}>{children}</Typography>
}

export function HeadlineLarge({ children, ...props }: Omit<TypographyProps, 'variant'>) {
  return <Typography variant="headlineLarge" {...props}>{children}</Typography>
}

export function TitleLarge({ children, ...props }: Omit<TypographyProps, 'variant'>) {
  return <Typography variant="titleLarge" {...props}>{children}</Typography>
}

export function BodyLarge({ children, ...props }: Omit<TypographyProps, 'variant'>) {
  return <Typography variant="bodyLarge" {...props}>{children}</Typography>
}

