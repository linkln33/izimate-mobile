/**
 * Material Design 3 Card Component
 * Industry-standard card with proper elevation and spacing
 */

import React from 'react'
import { Card as PaperCard } from 'react-native-paper'
import { ViewStyle } from 'react-native'
import { colors, spacing, borderRadius, elevation } from '@/lib/design-system'
import type { CardProps as PaperCardProps } from 'react-native-paper'

interface CardProps extends PaperCardProps {
  variant?: 'elevated' | 'outlined' | 'filled'
  elevationLevel?: 0 | 1 | 2 | 3 | 4 | 5
  padding?: 'none' | 'small' | 'medium' | 'large'
}

export function Card({
  variant = 'elevated',
  elevationLevel = 1,
  padding = 'medium',
  style,
  contentStyle,
  children,
  ...props
}: CardProps) {
  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0
      case 'small':
        return spacing.sm
      case 'medium':
        return spacing.lg
      case 'large':
        return spacing.xl
    }
  }

  const getElevation = () => {
    return elevation[`level${elevationLevel}` as keyof typeof elevation]
  }

  const cardStyle = [
    {
      borderRadius: borderRadius.md,
      backgroundColor: colors.surface,
      ...(variant === 'elevated' ? getElevation() : {}),
      ...(variant === 'outlined' ? {
        borderWidth: 1,
        borderColor: colors.outline,
      } : {}),
      ...(variant === 'filled' ? {
        backgroundColor: colors.surfaceVariant,
      } : {}),
    },
    style,
  ]

  return (
    <PaperCard
      mode={variant === 'outlined' ? 'outlined' : 'elevated'}
      style={cardStyle}
      contentStyle={[
        {
          padding: getPadding(),
        },
        contentStyle,
      ]}
      {...props}
    >
      {children}
    </PaperCard>
  )
}
