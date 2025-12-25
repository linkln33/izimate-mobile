/**
 * Export Design Tokens to Figma
 * Converts our design system (lib/theme.ts) to Figma-compatible format
 */

import { colors, spacing, typography, borderRadius, shadows } from '../theme'

export interface FigmaDesignToken {
  name: string
  value: string | number
  type: 'color' | 'spacing' | 'typography' | 'radius' | 'shadow'
  description?: string
}

export function exportColorsToFigma(): FigmaDesignToken[] {
  const tokens: FigmaDesignToken[] = []
  
  // Primary colors
  tokens.push(
    { name: 'Primary', value: colors.primary, type: 'color', description: 'Main brand color' },
    { name: 'Primary Dark', value: colors.primaryDark, type: 'color' },
    { name: 'Primary Light', value: colors.primaryLight, type: 'color' },
  )
  
  // Secondary colors
  tokens.push(
    { name: 'Secondary', value: colors.secondary, type: 'color' },
    { name: 'Secondary Dark', value: colors.secondaryDark, type: 'color' },
    { name: 'Secondary Light', value: colors.secondaryLight, type: 'color' },
  )
  
  // Status colors
  tokens.push(
    { name: 'Success', value: colors.success, type: 'color' },
    { name: 'Warning', value: colors.warning, type: 'color' },
    { name: 'Error', value: colors.error, type: 'color' },
    { name: 'Info', value: colors.info, type: 'color' },
  )
  
  // Text colors
  tokens.push(
    { name: 'Text Primary', value: colors.text.primary, type: 'color' },
    { name: 'Text Secondary', value: colors.text.secondary, type: 'color' },
    { name: 'Text Tertiary', value: colors.text.tertiary, type: 'color' },
    { name: 'Text Disabled', value: colors.text.disabled, type: 'color' },
  )
  
  // Background colors
  tokens.push(
    { name: 'Background', value: colors.background, type: 'color' },
    { name: 'Background Secondary', value: colors.backgroundSecondary, type: 'color' },
    { name: 'Background Tertiary', value: colors.backgroundTertiary, type: 'color' },
  )
  
  return tokens
}

export function exportSpacingToFigma(): FigmaDesignToken[] {
  return Object.entries(spacing).map(([key, value]) => ({
    name: `Spacing ${key.toUpperCase()}`,
    value: `${value}px`,
    type: 'spacing' as const,
    description: `${key} spacing (${value}px)`,
  }))
}

export function exportTypographyToFigma(): FigmaDesignToken[] {
  const tokens: FigmaDesignToken[] = []
  
  // Font sizes
  Object.entries(typography.fontSize).forEach(([key, value]) => {
    tokens.push({
      name: `Font Size ${key.toUpperCase()}`,
      value: `${value}px`,
      type: 'typography',
      description: `${key} font size`,
    })
  })
  
  // Font weights
  Object.entries(typography.fontWeight).forEach(([key, value]) => {
    tokens.push({
      name: `Font Weight ${key}`,
      value: value,
      type: 'typography',
      description: `${key} font weight`,
    })
  })
  
  return tokens
}

export function exportBorderRadiusToFigma(): FigmaDesignToken[] {
  return Object.entries(borderRadius).map(([key, value]) => ({
    name: `Radius ${key.toUpperCase()}`,
    value: `${value}px`,
    type: 'radius',
    description: `${key} border radius (${value}px)`,
  }))
}

export function exportAllDesignTokens(): FigmaDesignToken[] {
  return [
    ...exportColorsToFigma(),
    ...exportSpacingToFigma(),
    ...exportTypographyToFigma(),
    ...exportBorderRadiusToFigma(),
  ]
}

// Generate JSON for Figma import
export function generateFigmaTokensJSON(): string {
  const tokens = exportAllDesignTokens()
  
  const figmaFormat = {
    colors: tokens.filter(t => t.type === 'color').map(t => ({
      name: t.name,
      value: t.value,
      description: t.description,
    })),
    spacing: tokens.filter(t => t.type === 'spacing').map(t => ({
      name: t.name,
      value: t.value,
      description: t.description,
    })),
    typography: tokens.filter(t => t.type === 'typography').map(t => ({
      name: t.name,
      value: t.value,
      description: t.description,
    })),
    radius: tokens.filter(t => t.type === 'radius').map(t => ({
      name: t.name,
      value: t.value,
      description: t.description,
    })),
  }
  
  return JSON.stringify(figmaFormat, null, 2)
}

