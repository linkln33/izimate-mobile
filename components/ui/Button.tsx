/**
 * Material Design 3 Button Component with Glassmorphism
 * Industry-standard button with proper accessibility and touch targets
 * Minimum touch target: 48x48pt (Material Design standard)
 * Modern glassmorphic design for premium feel
 */

import React from 'react'
import { Button as PaperButton } from 'react-native-paper'
import { StyleSheet, ViewStyle, TextStyle, Platform, Pressable, Text } from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, spacing, borderRadius, typography, componentSizes, elevation } from '@/lib/design-system'
import type { ButtonProps as PaperButtonProps } from 'react-native-paper'

interface ButtonProps extends Omit<PaperButtonProps, 'theme' | 'style' | 'contentStyle' | 'labelStyle'> {
  variant?: 'filled' | 'outlined' | 'text' | 'elevated' | 'tonal' | 'glass'
  size?: 'small' | 'medium' | 'large'
  fullWidth?: boolean
  style?: ViewStyle
  contentStyle?: ViewStyle
  labelStyle?: TextStyle
}

export function Button({
  variant = 'filled',
  size = 'medium',
  fullWidth = false,
  style,
  contentStyle,
  labelStyle,
  children,
  ...props
}: ButtonProps) {
  // Material Design 3 button modes
  const getMode = () => {
    switch (variant) {
      case 'filled':
        return 'contained'
      case 'outlined':
        return 'outlined'
      case 'text':
        return 'text'
      case 'elevated':
        return 'contained-tonal'
      case 'tonal':
        return 'contained-tonal'
      default:
        return 'contained'
    }
  }

  // Size-based styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          minHeight: componentSizes.button.small,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
        }
      case 'medium':
        return {
          minHeight: componentSizes.button.medium,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        }
      case 'large':
        return {
          minHeight: componentSizes.button.large,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
        }
    }
  }

  // Variant-based styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return {
          backgroundColor: colors.primary,
          borderRadius: borderRadius.md,
        }
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.outline,
          borderRadius: borderRadius.md,
        }
      case 'text':
        return {
          backgroundColor: 'transparent',
          borderRadius: borderRadius.md,
        }
      case 'elevated':
      case 'tonal':
        return {
          backgroundColor: colors.primaryContainer,
          borderRadius: borderRadius.md,
        }
      case 'glass':
        return {
          backgroundColor: 'transparent',
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.3)',
        }
      default:
        return {
          backgroundColor: colors.primary,
          borderRadius: borderRadius.md,
        }
    }
  }

  // Typography styles
  const getLabelStyles = () => {
    const baseStyle = {
      fontSize: typography.fontSize.labelLarge,
      fontWeight: typography.fontWeight.medium,
      letterSpacing: typography.letterSpacing.normal,
    }

    switch (variant) {
      case 'filled':
      case 'elevated':
      case 'tonal':
        return {
          ...baseStyle,
          color: colors.onPrimary,
        }
      case 'outlined':
      case 'text':
        return {
          ...baseStyle,
          color: colors.primary,
        }
    }
  }

  const sizeStyles = getSizeStyles()
  const variantStyles = getVariantStyles()
  const labelStyles = getLabelStyles()

  // Glassmorphic button with blur effect
  if (variant === 'glass') {
    return (
      <Pressable
        onPress={props.onPress}
        disabled={props.disabled}
        style={({ pressed }) => [
          {
            minHeight: sizeStyles.minHeight,
            minWidth: componentSizes.touchTarget.standard,
            borderRadius: variantStyles.borderRadius,
            overflow: 'hidden',
            ...(fullWidth && { width: '100%' }),
            opacity: pressed ? 0.8 : 1,
            ...(Platform.OS === 'web' ? {
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            } : elevation.level2),
          },
          style,
        ]}
      >
        <BlurView
          intensity={80}
          tint="light"
          style={[
            {
              paddingHorizontal: sizeStyles.paddingHorizontal,
              paddingVertical: sizeStyles.paddingVertical,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: sizeStyles.minHeight,
            },
            contentStyle,
          ]}
        >
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={[labelStyles, { color: colors.primary, fontWeight: '600' }, labelStyle]}>
            {children}
          </Text>
        </BlurView>
      </Pressable>
    )
  }

  return (
    <PaperButton
      mode={getMode()}
      style={[
        {
          minHeight: sizeStyles.minHeight,
          minWidth: componentSizes.touchTarget.standard, // Ensure minimum touch target
          borderRadius: variantStyles.borderRadius,
          ...(fullWidth && { width: '100%' }),
          ...(variant === 'filled' && Platform.OS !== 'web' ? elevation.level2 : {}),
        },
        style,
      ]}
      contentStyle={[
        {
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
        },
        contentStyle,
      ]}
      labelStyle={[
        labelStyles,
        labelStyle,
      ]}
      {...props}
    >
      {children}
    </PaperButton>
  )
}
