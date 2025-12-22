// Location utilities
import * as Location from 'expo-location'

export interface UserLocation {
  lat: number
  lng: number
}

/**
 * Get current user location
 */
export async function getCurrentLocation(): Promise<UserLocation> {
  console.log('🔐 Requesting location permissions...')
  const { status } = await Location.requestForegroundPermissionsAsync()
  
  if (status !== 'granted') {
    console.error('❌ Location permission denied:', status)
    throw new Error('Location permission was denied. Please enable location access in your device settings.')
  }

  console.log('✅ Location permission granted, getting position...')
  
  // Use high accuracy for better results
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
    mayShowUserSettingsDialog: true,
  })

  const coords = {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
  }
  
  console.log('📍 Got GPS coordinates:', coords)
  
  // Validate coordinates are not invalid
  if (!coords.lat || !coords.lng || isNaN(coords.lat) || isNaN(coords.lng)) {
    throw new Error('Invalid location coordinates received. Please try again.')
  }

  return coords
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const addresses = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
    
    if (addresses && addresses.length > 0) {
      const addr = addresses[0]
      const parts: string[] = []
      
      if (addr.street) parts.push(addr.street)
      if (addr.city) parts.push(addr.city)
      if (addr.region) parts.push(addr.region)
      if (addr.postalCode) parts.push(addr.postalCode)
      if (addr.country) parts.push(addr.country)
      
      return parts.join(', ')
    }
    
    return `${lat}, ${lng}`
  } catch (error) {
    console.error('Error reverse geocoding:', error)
    return `${lat}, ${lng}`
  }
}

/**
 * Forward geocode address to coordinates
 * NOTE: Geocoding API is deprecated in SDK 49+, use Place Autocomplete instead
 * This function is kept for backward compatibility but may not work
 */
export async function geocodeAddress(address: string): Promise<UserLocation | null> {
  try {
    // Try using reverse geocode with a workaround, but this is not recommended
    // For new implementations, use Google Places Autocomplete instead
    console.warn('geocodeAddress is deprecated. Use Google Places Autocomplete instead.')
    return null
  } catch (error) {
    console.error('Error geocoding address:', error)
    return null
  }
}

/**
 * Calculate distance between two coordinates in km
 * Note: This function is also exported from listings.ts to avoid duplicate exports
 */
export function calculateDistanceLocation(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Re-export as calculateDistance for convenience
export { calculateDistanceLocation as calculateDistance }
