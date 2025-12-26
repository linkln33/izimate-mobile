# Pastel Design System Guide

## Overview

This design system provides a beautiful, consistent, and accessible pastel color palette with proper contrast ratios. All colors meet WCAG AA standards (4.5:1 contrast ratio for text).

## Key Principles

1. **No Borders by Default** - Use elevation/shadows for depth instead
2. **Proper Contrast** - All text meets accessibility standards
3. **Consistent Spacing** - 4px base grid system
4. **Subtle Shadows** - Light, airy elevation system
5. **Pastel Colors** - Soft, inviting, professional

## Usage

### Import the Design System

```typescript
import { pastelDesignSystem } from '@/lib/pastel-design-system'
// Or import specific parts:
import { pastelColors, surfaces, elevation, spacing, borderRadius } from '@/lib/pastel-design-system'
```

### Colors

```typescript
// Primary colors (soft coral)
pastelColors.primary[50]   // Lightest - backgrounds
pastelColors.primary[500]  // Base - primary actions
pastelColors.primary[900] // Darkest - maximum contrast

// Secondary colors (soft sky blue)
pastelColors.secondary[500]

// Accent colors (soft mint)
pastelColors.accent[500]

// Semantic colors
pastelColors.success[500]
pastelColors.warning[500]
pastelColors.error[500]
pastelColors.info[500]

// Neutral grays
pastelColors.neutral[50]  // Lightest backgrounds
pastelColors.neutral[900] // Darkest text
```

### Surfaces

```typescript
surfaces.background        // Main app background
surfaces.surface           // Card backgrounds
surfaces.surfaceVariant    // Subtle variations
surfaces.onSurface         // Text on surfaces
surfaces.outline           // Subtle borders (use sparingly)
```

### Elevation (Shadows)

```typescript
// Use elevation instead of borders
elevation.level0  // No shadow
elevation.level1  // Subtle (cards)
elevation.level2  // Medium (elevated cards)
elevation.level3  // High (modals)
```

### Component Styles

```typescript
// Pre-defined consistent styles
componentStyles.card         // Basic card
componentStyles.cardElevated // Card with shadow
componentStyles.container    // Main container
componentStyles.input        // Input field
componentStyles.button       // Button
componentStyles.section      // Section container
```

## Examples

### Card Component

```typescript
import { View, Text, StyleSheet } from 'react-native'
import { pastelDesignSystem } from '@/lib/pastel-design-system'

const { colors, surfaces, elevation, spacing, borderRadius } = pastelDesignSystem

const Card = ({ title, children }) => (
  <View style={styles.card}>
    <Text style={styles.title}>{title}</Text>
    {children}
  </View>
)

const styles = StyleSheet.create({
  card: {
    backgroundColor: surfaces.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...elevation.level1, // Subtle shadow instead of border
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: surfaces.onSurface,
    marginBottom: spacing.sm,
  },
})
```

### Container with Background

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: surfaces.background, // Light pastel background
    padding: spacing.lg,
  },
})
```

### Button

```typescript
const styles = StyleSheet.create({
  button: {
    backgroundColor: pastelColors.primary[500],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...elevation.level1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
})
```

### Input Field

```typescript
const styles = StyleSheet.create({
  input: {
    backgroundColor: surfaces.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: surfaces.outline, // Subtle border only for inputs
    padding: spacing.md,
    fontSize: 16,
    color: surfaces.onSurface,
    marginBottom: spacing.md,
  },
})
```

## Migration Checklist

- [ ] Replace all hardcoded colors with `pastelColors`
- [ ] Replace all hardcoded backgrounds with `surfaces`
- [ ] Remove unnecessary borders, use `elevation` instead
- [ ] Use `spacing` constants instead of magic numbers
- [ ] Use `borderRadius` constants for consistency
- [ ] Ensure text colors have proper contrast (use `surfaces.onSurface` for dark text)
- [ ] Replace `colors.vibrant.*` with `pastelColors.*`
- [ ] Update all card components to use `elevation` instead of borders

## Color Contrast Guidelines

- **Body text**: Use `surfaces.onSurface` (dark) on `surfaces.surface` (white) = 15:1 contrast ✅
- **Secondary text**: Use `surfaces.onSurfaceVariant` (gray-700) on `surfaces.surface` = 7:1 contrast ✅
- **Primary buttons**: Use white text on `pastelColors.primary[500]` = 4.5:1 contrast ✅
- **Backgrounds**: Use `surfaces.background` (neutral-50) for main backgrounds

## Do's and Don'ts

### ✅ Do:
- Use elevation for depth instead of borders
- Use `surfaces.surface` for card backgrounds
- Use `surfaces.background` for main app background
- Use proper contrast ratios for text
- Use spacing constants for consistency
- Use borderRadius constants

### ❌ Don't:
- Don't use borders on cards (use elevation instead)
- Don't use hardcoded colors
- Don't use hardcoded spacing values
- Don't use colors that don't meet contrast requirements
- Don't mix old `colors.vibrant.*` with new `pastelColors.*`

## React Native Paper Integration

The design system is integrated with React Native Paper through `pastelPaperTheme`. All Paper components will automatically use the pastel color scheme.

```typescript
import { Button, Card, TextInput } from 'react-native-paper'
// These components automatically use the pastel theme
```

