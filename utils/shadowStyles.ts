import { Platform } from 'react-native'

/**
 * Creates shadow styles compatible with React Native Web
 * Uses boxShadow for web, shadow* properties for native
 */
export function createShadowStyle(
  opacity: number = 0.2,
  radius: number = 8,
  offset: { width: number; height: number } = { width: 0, height: 4 },
  color: string = '#000',
  elevation?: number
) {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `${offset.width}px ${offset.height}px ${radius}px rgba(0, 0, 0, ${opacity})`,
    }
  }
  return {
    shadowColor: color,
    shadowOffset: offset,
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: elevation ?? 5,
  }
}

/**
 * Creates text shadow styles compatible with React Native Web
 * Uses textShadow for web, textShadow* properties for native
 */
export function createTextShadowStyle(
  opacity: number = 0.3,
  radius: number = 4,
  offset: { width: number; height: number } = { width: 2, height: 2 }
) {
  if (Platform.OS === 'web') {
    return {
      textShadow: `${offset.width}px ${offset.height}px ${radius}px rgba(0, 0, 0, ${opacity})`,
    }
  }
  return {
    textShadowColor: `rgba(0, 0, 0, ${opacity})`,
    textShadowOffset: offset,
    textShadowRadius: radius,
  }
}
