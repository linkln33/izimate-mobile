/**
 * Material Design 3 TextInput Component
 * Industry-standard input with proper accessibility
 */

import React from 'react'
import { TextInput as PaperTextInput } from 'react-native-paper'
import { ViewStyle, TextStyle } from 'react-native'
import { colors, spacing, borderRadius, typography } from '@/lib/design-system'
import type { TextInputProps as PaperTextInputProps } from 'react-native-paper'

interface TextInputProps extends Omit<PaperTextInputProps, 'theme' | 'style' | 'contentStyle'> {
  variant?: 'filled' | 'outlined'
  size?: 'small' | 'medium' | 'large'
  fullWidth?: boolean
  style?: ViewStyle
  contentStyle?: ViewStyle
}

export function TextInput({
  variant = 'outlined',
  size = 'medium',
  fullWidth = false,
  style,
  contentStyle,
  ...props
}: TextInputProps) {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          height: 40,
          fontSize: typography.fontSize.bodySmall,
        }
      case 'medium':
        return {
          height: 56, // Material Design standard
          fontSize: typography.fontSize.bodyLarge,
        }
      case 'large':
        return {
          height: 64,
          fontSize: typography.fontSize.titleMedium,
        }
    }
  }

  const sizeStyles = getSizeStyles()

  return (
    <PaperTextInput
      mode={variant}
      style={[
        {
          ...(fullWidth && { width: '100%' }),
        },
        style,
      ]}
      contentStyle={[
        {
          height: sizeStyles.height,
          fontSize: sizeStyles.fontSize,
        },
        contentStyle,
      ]}
      {...props}
    />
  )
}

