import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Switch } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LocationPickerMap } from '@/components/location/LocationPickerMap'
import type { ListingFormState, ListingFormActions } from '../useListingForm'

interface Step3LocationProps {
  formState: ListingFormState
  formActions: ListingFormActions
  loading: boolean
  onDetectLocation: () => void
}

export function Step3Location({
  formState,
  formActions,
  loading,
  onDetectLocation,
}: Step3LocationProps) {
  const {
    locationAddress,
    locationLat,
    locationLng,
    showExactAddress,
    streetAddress,
    city,
    state,
    postalCode,
    country,
    locationNotes,
  } = formState

  const {
    setLocationAddress,
    setLocationLat,
    setLocationLng,
    setShowExactAddress,
    setStreetAddress,
    setCity,
    setState,
    setPostalCode,
    setCountry,
    setLocationNotes,
  } = formActions

  return (
    <View>
      <Text style={styles.stepTitle}>Location</Text>

      {/* Map Picker with Search - Always visible */}
      <View style={styles.inputGroup}>
        <LocationPickerMap
          onLocationSelect={(location: any) => {
            setLocationAddress(location.address || locationAddress)
            setLocationLat(location.lat || locationLat)
            setLocationLng(location.lng || locationLng)
            
            // Optionally auto-fill manual address fields if toggle is enabled
            if (showExactAddress && location.streetAddress) {
              if (location.streetAddress) setStreetAddress(location.streetAddress)
              if (location.city) setCity(location.city)
              if (location.state) setState(location.state)
              if (location.postalCode) setPostalCode(location.postalCode)
              if (location.country) setCountry(location.country)
            }
          }}
          initialAddress={locationAddress}
          initialLat={locationLat || undefined}
          initialLng={locationLng || undefined}
        />
      </View>

      {/* Address Input - Display only */}
      {locationAddress && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Selected Address</Text>
          <Text style={styles.addressDisplay}>{locationAddress}</Text>
        </View>
      )}

      {/* Add Manual Address Toggle */}
      <View style={styles.inputGroup}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleLabelContainer}>
            <Text style={styles.label}>Add Manual Address</Text>
            <Text style={styles.toggleDescription}>
              Enable to enter detailed address information manually
            </Text>
          </View>
          <Switch
            value={showExactAddress}
            onValueChange={setShowExactAddress}
            trackColor={{ false: '#e5e7eb', true: '#f25842' }}
            thumbColor={showExactAddress ? '#ffffff' : '#f3f4f6'}
            ios_backgroundColor="#e5e7eb"
          />
        </View>
      </View>

      {/* Manual Address Entry */}
      {showExactAddress && (
        <View style={styles.inputGroup}>
          <View style={styles.manualAddressBox}>
            <Text style={styles.manualAddressTitle}>Manual Address Entry</Text>
            <Text style={styles.manualAddressDescription}>
              Enter address details manually. This will be shown to matched providers.
            </Text>

            {/* Street Address */}
            <View style={styles.addressField}>
              <Text style={styles.addressLabel}>Street Address *</Text>
              <TextInput
                style={styles.addressInput}
                value={streetAddress}
                onChangeText={setStreetAddress}
                placeholder="123 Main Street, Apt 4B"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* City and State Row */}
            <View style={styles.addressRow}>
              <View style={[styles.addressField, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.addressLabel}>City *</Text>
                <TextInput
                  style={styles.addressInput}
                  value={city}
                  onChangeText={setCity}
                  placeholder="London"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={[styles.addressField, { flex: 1 }]}>
                <Text style={styles.addressLabel}>State/Province</Text>
                <TextInput
                  style={styles.addressInput}
                  value={state}
                  onChangeText={setState}
                  placeholder="Greater London"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            {/* Postal Code and Country Row */}
            <View style={styles.addressRow}>
              <View style={[styles.addressField, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.addressLabel}>Postal Code *</Text>
                <TextInput
                  style={styles.addressInput}
                  value={postalCode}
                  onChangeText={setPostalCode}
                  placeholder="SW1A 1AA"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={[styles.addressField, { flex: 1 }]}>
                <Text style={styles.addressLabel}>Country *</Text>
                <TextInput
                  style={styles.addressInput}
                  value={country}
                  onChangeText={setCountry}
                  placeholder="United Kingdom"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Location Notes */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Location Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={locationNotes}
          onChangeText={setLocationNotes}
          placeholder="Any additional location details or instructions..."
          multiline
          numberOfLines={4}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f25842',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  detectButtonDisabled: {
    opacity: 0.6,
  },
  detectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  manualAddressBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  manualAddressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  manualAddressDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
  },
  addressField: {
    marginBottom: 12,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  addressInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addressRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addressDisplay: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
})
