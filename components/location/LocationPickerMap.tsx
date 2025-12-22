// Web version - no native map imports
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
  // On web, pass null for native modules - base component will use fallback UI
  return <LocationPickerMapBase {...props} MapView={null} Marker={null} GooglePlacesAutocomplete={null} />
}
