import React, { useState, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Platform, Image, Alert, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getCurrentLocation, reverseGeocode } from '@/lib/utils/location'

type Region = {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}

interface LocationPickerMapBaseProps {
  onLocationSelect: (location: {
    address: string
    lat: number
    lng: number
    streetAddress?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }) => void
  initialAddress?: string
  initialLat?: number
  initialLng?: number
  MapView?: any
  Marker?: any
  GooglePlacesAutocomplete?: any
}

export function LocationPickerMapBase({
  onLocationSelect,
  initialAddress = '',
  initialLat,
  initialLng,
  MapView,
  Marker,
  GooglePlacesAutocomplete,
}: LocationPickerMapBaseProps) {
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number
    lng: number
    address: string
  } | null>(
    initialLat && initialLng
      ? {
          lat: initialLat,
          lng: initialLng,
          address: initialAddress,
        }
      : null
  )

  const [region, setRegion] = useState<Region>(
    initialLat && initialLng
      ? {
          latitude: initialLat,
          longitude: initialLng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }
      : {
          latitude: 51.5074, // London default
          longitude: -0.1278,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }
  )

  const [loading, setLoading] = useState(false)
  const mapRef = useRef<any>(null)

  const handlePlaceSelect = async (data: any, details: any) => {
    if (details?.geometry?.location) {
      // Extract address components for detailed address
      const addressComponents = details.address_components || []
      const getComponent = (type: string) => {
        const component = addressComponents.find((comp: any) => comp.types.includes(type))
        return component ? component.long_name : ''
      }

      const location = {
        lat: details.geometry.location.lat,
        lng: details.geometry.location.lng,
        address: details.formatted_address || data.description || '',
        // Include address components for auto-filling manual address fields
        streetAddress: `${getComponent('street_number')} ${getComponent('route')}`.trim(),
        city: getComponent('locality') || getComponent('postal_town') || getComponent('administrative_area_level_2'),
        state: getComponent('administrative_area_level_1'),
        postalCode: getComponent('postal_code'),
        country: getComponent('country'),
      }

      setSelectedLocation(location)
      
      const newRegion: Region = {
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
      setRegion(newRegion)
      
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000)
      }
      onLocationSelect(location)
    }
  }

  const handleMapPress = async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate
    setLoading(true)
    
    try {
      const address = await reverseGeocode(latitude, longitude)
      const location = {
        lat: latitude,
        lng: longitude,
        address,
      }
      
      setSelectedLocation(location)
      onLocationSelect(location)
    } catch (error) {
      console.error('Failed to reverse geocode:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCurrentLocation = async () => {
    setLoading(true)
    try {
      console.log('📍 Requesting current location...')
      const location = await getCurrentLocation()
      console.log('✅ Got location:', location)
      
      // Verify we got actual coordinates (not 0,0 or default London values)
      const isDefaultLondon = Math.abs(location.lat - 51.5074) < 0.0001 && Math.abs(location.lng - (-0.1278)) < 0.0001
      const isZero = location.lat === 0 && location.lng === 0
      
      if (!location || !location.lat || !location.lng || isNaN(location.lat) || isNaN(location.lng) || isZero || isDefaultLondon) {
        console.error('❌ Invalid or default location detected:', location)
        throw new Error('Invalid location received. Please ensure location services are enabled and try again.')
      }
      
      console.log('🌍 Reverse geocoding location...')
      const address = await reverseGeocode(location.lat, location.lng)
      console.log('✅ Got address:', address)
      
      // Try to get detailed address components for auto-fill
      let streetAddress = ''
      let city = ''
      let state = ''
      let postalCode = ''
      let country = ''
      
      try {
        // Use Google Geocoding API to get address components if available
        const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 
                       process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 
                       ''
        if (apiKey) {
          const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&key=${apiKey}`
          const response = await fetch(url)
          const data = await response.json()
          
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            const result = data.results[0]
            const addressComponents = result.address_components || []
            const getComponent = (type: string) => {
              const component = addressComponents.find((comp: any) => comp.types.includes(type))
              return component ? component.long_name : ''
            }
            
            streetAddress = `${getComponent('street_number')} ${getComponent('route')}`.trim()
            city = getComponent('locality') || getComponent('postal_town') || getComponent('administrative_area_level_2')
            state = getComponent('administrative_area_level_1')
            postalCode = getComponent('postal_code')
            country = getComponent('country')
          }
        }
      } catch (error) {
        console.log('Could not fetch detailed address components:', error)
      }
      
      const selected = {
        lat: location.lat,
        lng: location.lng,
        address,
        streetAddress,
        city,
        state,
        postalCode,
        country,
      }
      
      console.log('📍 Setting selected location:', selected)
      setSelectedLocation(selected)
      setAddressInput(address)
      
      const newRegion: Region = {
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
      setRegion(newRegion)
      
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000)
      }
      onLocationSelect(selected)
    } catch (error: any) {
      console.error('❌ Failed to get current location:', error)
      const errorMessage = error?.message || 'Could not get your current location. Please check location permissions and ensure location services are enabled.'
      Alert.alert(
        'Location Error',
        errorMessage,
        [
          {
            text: 'OK',
            style: 'default',
          },
        ]
      )
    } finally {
      setLoading(false)
    }
  }

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 
                 process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 
                 ''

  // Fallback for web or if Google Places/Maps is not available
  const isWebOrUnavailable = Platform.OS === 'web' || !apiKey || !MapView || !GooglePlacesAutocomplete
  
  const [addressInput, setAddressInput] = useState(initialAddress || '')
  const mapIframeRef = useRef<any>(null)

  // Web Map Iframe Component - embeds interactive Google Maps
  const WebMapIframe = React.forwardRef<any, { lat: number; lng: number; address: string }>(
    ({ lat, lng, address }, ref) => {
      // Use Google Maps embed without API key (works for basic maps)
      // If API key is authorized, it will use it, otherwise falls back to basic embed
      const mapUrl = `https://www.google.com/maps?q=${lat},${lng}&output=embed&zoom=15`
      
      const iframeRef = useRef<HTMLIFrameElement | null>(null)
      const lastMapUrlRef = useRef<string>('')
      
      useEffect(() => {
        // Only update if URL actually changed
        if (mapUrl === lastMapUrlRef.current) {
          return
        }
        lastMapUrlRef.current = mapUrl
        
        // Update iframe src when location changes
        if (Platform.OS === 'web' && ref && typeof document !== 'undefined') {
          const node = (ref as any).current
          if (!node) {
            return
          }
          
          // Access the underlying DOM node in React Native Web
          const domNode = node._nativeNode || 
                         node._internalFiberInstanceHandleDEV?.stateNode || 
                         (node as any).firstElementChild ||
                         node
          
          if (domNode) {
            // Find or create iframe (only once)
            let iframe = iframeRef.current || domNode.querySelector?.('iframe')
            if (!iframe && domNode.appendChild) {
              // Create new iframe
              iframe = document.createElement('iframe')
              iframe.width = '100%'
              iframe.height = '100%'
              iframe.frameBorder = '0'
              iframe.style.border = '0'
              iframe.style.borderRadius = '12px'
              iframe.loading = 'lazy'
              iframe.allowFullscreen = true
              iframe.referrerPolicy = 'no-referrer-when-downgrade'
              domNode.appendChild(iframe)
              iframeRef.current = iframe
            }
            
            // Update iframe src when location changes
            if (iframe && iframe.src !== mapUrl) {
              iframe.src = mapUrl
            }
          }
        }
      }, [lat, lng, mapUrl, ref])
      
      if (Platform.OS === 'web') {
        return (
          <View
            ref={ref}
            style={{ 
              width: '100%', 
              height: '100%', 
              borderRadius: 12, 
              overflow: 'hidden',
              backgroundColor: '#f3f4f6',
            }}
          />
        )
      }
      return null
    }
  )
  
  WebMapIframe.displayName = 'WebMapIframe'

  // Geocode address/postcode to coordinates
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number; address: string } | null> => {
    // Try multiple API key sources (mobile uses EXPO_PUBLIC_, web uses NEXT_PUBLIC_)
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 
                   process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
                   (typeof window !== 'undefined' && (window as any).GOOGLE_MAPS_API_KEY) || 
                   ''
    console.log('🔍 Geocoding address:', address, 'API Key present:', !!apiKey)
    
    if (!apiKey) {
      console.warn('⚠️ No Google Maps API key found.')
      // Try using Nominatim (OpenStreetMap) as a free fallback
      return await geocodeWithNominatim(address)
    }
    
    // Try Google first, fallback to Nominatim on error
    try {
      const encodedAddress = encodeURIComponent(address)
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
      
      console.log('🌐 Fetching geocode from Google:', url.replace(apiKey, 'API_KEY_HIDDEN'))
      const response = await fetch(url)
      const data = await response.json()
      
      console.log('📍 Geocode response:', data.status, data.results?.length || 0, 'results')
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0]
        const location = result.geometry.location
        const geocodedLocation = {
          lat: location.lat,
          lng: location.lng,
          address: result.formatted_address,
        }
        console.log('✅ Geocoded via Google:', geocodedLocation)
        return geocodedLocation
      } else if (data.status === 'REQUEST_DENIED' || data.error_message?.includes('not authorized')) {
        console.warn('⚠️ Google API key not authorized, falling back to Nominatim')
        return await geocodeWithNominatim(address)
      } else {
        console.warn('❌ Geocoding failed:', data.status, data.error_message || '')
        // Fallback to Nominatim
        return await geocodeWithNominatim(address)
      }
    } catch (error) {
      console.error('❌ Google geocoding error:', error)
      // Fallback to Nominatim
      return await geocodeWithNominatim(address)
    }
  }
  
  // Helper function for Nominatim geocoding (free, no API key needed)
  const geocodeWithNominatim = async (address: string): Promise<{ lat: number; lng: number; address: string } | null> => {
    try {
      const encodedAddress = encodeURIComponent(address)
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`
      
      console.log('🌐 Trying Nominatim geocoding:', url)
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'iZimate Job App',
        },
      })
      const data = await response.json()
      
      if (data && data.length > 0) {
        const result = data[0]
        const geocodedLocation = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          address: result.display_name,
        }
        console.log('✅ Geocoded via Nominatim:', geocodedLocation)
        return geocodedLocation
      }
    } catch (error) {
      console.error('❌ Nominatim geocoding error:', error)
    }
    
    return null
  }

  // Update addressInput when selectedLocation changes from outside
  useEffect(() => {
    if (selectedLocation?.address && selectedLocation.address !== addressInput) {
      setAddressInput(selectedLocation.address)
    }
  }, [selectedLocation?.address])

  if (isWebOrUnavailable) {
    // For web, always show map (default to London if no location)
    const displayLocation = selectedLocation || {
      lat: 51.5074,
      lng: -0.1278,
      address: 'London, UK',
    }
    
    console.log('🗺️ Rendering map with location:', displayLocation)
    
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Location Search</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter postcode or address"
            value={addressInput}
            onChangeText={setAddressInput}
            onSubmitEditing={async () => {
              // Geocode the address/postcode when user presses enter
              if (addressInput.trim()) {
                console.log('📝 Submitting address:', addressInput.trim())
                setLoading(true)
                try {
                  const geocoded = await geocodeAddress(addressInput.trim())
                  if (geocoded) {
                    console.log('✅ Setting location:', geocoded)
                    setSelectedLocation(geocoded)
                    setAddressInput(geocoded.address)
                    onLocationSelect(geocoded)
                  } else {
                    console.warn('⚠️ Geocoding returned null')
                    // Don't show alert on every failure, just log it
                    // The map will stay at current location
                  }
                } catch (error) {
                  console.error('❌ Failed to geocode address:', error)
                  Alert.alert('Error', 'Failed to find location. Please try again.')
                } finally {
                  setLoading(false)
                }
              }
            }}
            onBlur={async () => {
              // Geocode when user leaves the field
              if (addressInput.trim() && addressInput !== selectedLocation?.address) {
                console.log('👋 Blur - geocoding:', addressInput.trim())
                setLoading(true)
                try {
                  const geocoded = await geocodeAddress(addressInput.trim())
                  if (geocoded) {
                    console.log('✅ Blur - setting location:', geocoded)
                    setSelectedLocation(geocoded)
                    setAddressInput(geocoded.address)
                    onLocationSelect(geocoded)
                  }
                } catch (error) {
                  console.error('❌ Blur - geocoding error:', error)
                } finally {
                  setLoading(false)
                }
              }
            }}
          />
          <Pressable 
            style={[styles.locationButtonInInput, loading && styles.buttonDisabled]} 
            onPress={handleCurrentLocation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#f25842" />
            ) : (
              <Ionicons name="location" size={20} color="#f25842" />
            )}
          </Pressable>
        </View>

        {/* Map Display - Embedded Google Maps iframe for web */}
        {Platform.OS === 'web' && (
          <View style={styles.mapContainer}>
            <WebMapIframe
              key={`${displayLocation.lat}-${displayLocation.lng}`}
              ref={mapIframeRef}
              lat={displayLocation.lat}
              lng={displayLocation.lng}
              address={displayLocation.address}
            />
          </View>
        )}

        {selectedLocation && (
          <View style={styles.locationInfo}>
            <Text style={styles.locationText}>
              {selectedLocation.address}
            </Text>
            {selectedLocation.lat && selectedLocation.lng && (
              <>
                <Text style={styles.coordinatesText}>
                  {`${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`}
                </Text>
                {/* Waze Directions Button */}
                <Pressable
                  onPress={() => {
                    const wazeUrl = `https://waze.com/ul?ll=${selectedLocation.lat},${selectedLocation.lng}&navigate=yes&utm_source=izimate-job`
                    if (Platform.OS === 'web') {
                      if (typeof window !== 'undefined') {
                        window.open(wazeUrl, '_blank', 'noopener,noreferrer')
                      }
                    } else {
                      Linking.openURL(wazeUrl).catch((error) => {
                        console.error('Failed to open Waze:', error)
                        Alert.alert('Error', 'Could not open Waze. Please install Waze app or use the web version.')
                      })
                    }
                  }}
                  style={styles.wazeButton}
                >
                  <Ionicons name="navigate" size={16} color="#ffffff" />
                  <Text style={styles.wazeButtonText}>Get Directions with Waze</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.autocompleteWrapper}>
          <GooglePlacesAutocomplete
            placeholder="Search for an address..."
            onPress={handlePlaceSelect}
            query={{
              key: apiKey,
              language: 'en',
              // No country restriction - allow international addresses
            }}
            fetchDetails={true}
            enablePoweredByContainer={false}
            styles={{
              container: styles.autocompleteContainer,
              textInput: styles.autocompleteInput,
              listView: styles.autocompleteList,
              row: styles.autocompleteRow,
              description: styles.autocompleteDescription,
            }}
            textInputProps={{
              placeholderTextColor: '#9ca3af',
            }}
          />
          <Pressable 
            style={[styles.locationButtonInAutocomplete, loading && styles.buttonDisabled]} 
            onPress={handleCurrentLocation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#f25842" />
            ) : (
              <Ionicons name="location" size={20} color="#f25842" />
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={region}
          onPress={handleMapPress}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {selectedLocation && (
            <Marker
              coordinate={{
                latitude: selectedLocation.lat,
                longitude: selectedLocation.lng,
              }}
              title={selectedLocation.address}
            />
          )}
        </MapView>

        {/* Current location button on map - kept for map interaction */}
        <Pressable style={styles.currentLocationButton} onPress={handleCurrentLocation}>
          {loading ? (
            <ActivityIndicator size="small" color="#f25842" />
          ) : (
            <Ionicons name="location" size={24} color="#f25842" />
          )}
        </Pressable>
      </View>

      {selectedLocation && (
        <View style={styles.locationInfo}>
          <View style={styles.locationInfoRow}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.locationText} numberOfLines={2}>
              {selectedLocation.address || 'Location selected'}
            </Text>
          </View>
          {selectedLocation.lat != null && selectedLocation.lng != null && (
            <Text style={styles.coordinatesText}>
              {`${Number(selectedLocation.lat).toFixed(6)}, ${Number(selectedLocation.lng).toFixed(6)}`}
            </Text>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  searchContainer: {
    marginBottom: 12,
    zIndex: 1000,
  },
  autocompleteWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  autocompleteContainer: {
    flex: 1,
  },
  autocompleteInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingRight: 50,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  locationButtonInAutocomplete: {
    position: 'absolute',
    right: 12,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  autocompleteList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 4,
    maxHeight: 200,
  },
  autocompleteRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  autocompleteDescription: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  mapContainer: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  currentLocationButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 4,
        }),
  },
  currentLocationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#f25842',
    fontWeight: '600',
  },
  locationInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
    gap: 12,
  },
  locationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  wazeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 4,
  },
  wazeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  coordinatesText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingRight: 50,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  locationButtonInInput: {
    position: 'absolute',
    right: 12,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlayFallback: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  mapOverlayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  staticMapText: {
    marginTop: 12,
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  staticMapAddress: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
})
