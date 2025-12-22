// Native-only version with full Google Maps support
import { useState, useRef } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import MapView, { Marker } from 'react-native-maps'
import type { Region } from 'react-native-maps'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
import { getCurrentLocation, reverseGeocode } from '@/lib/utils/location'
import { LocationPickerMapBase } from './LocationPickerMap.base'

interface LocationPickerMapProps {
  onLocationSelect: (location: {
    address: string
    lat: number
    lng: number
  }) => void
  initialAddress?: string
  initialLat?: number
  initialLng?: number
}

export function LocationPickerMap(props: LocationPickerMapProps) {
  return <LocationPickerMapBase {...props} MapView={MapView} Marker={Marker} GooglePlacesAutocomplete={GooglePlacesAutocomplete} />
}
