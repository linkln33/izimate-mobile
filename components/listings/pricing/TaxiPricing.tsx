/**
 * Taxi Pricing Component
 * Handles pricing configuration for taxi listings
 */

import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native'
import type { ListingFormState, ListingFormActions } from '../useListingForm'
import { CURRENCIES, type Currency } from './types'

interface TaxiPricingProps {
  formState: ListingFormState
  formActions: ListingFormActions
}

export function TaxiPricing({ formState, formActions }: TaxiPricingProps) {
  const {
    currency,
    taxi_vehicle_type,
    taxi_max_passengers,
    taxi_license_number,
    budgetMin,
  } = formState

  const {
    setTaxiVehicleType,
    setTaxiMaxPassengers,
    setTaxiLicenseNumber,
    setBudgetMin,
  } = formActions

  const selectedCurrency: Currency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]

  return (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Vehicle Type</Text>
        <View style={styles.budgetTypeButtons}>
          {(['standard', 'luxury', 'van', 'motorcycle', 'bike'] as const).map((type) => (
            <Pressable
              key={type}
              style={[
                styles.budgetTypeButton,
                taxi_vehicle_type === type && styles.budgetTypeButtonActive,
              ]}
              onPress={() => setTaxiVehicleType?.(type)}
            >
              <Text
                style={[
                  styles.budgetTypeButtonText,
                  taxi_vehicle_type === type && styles.budgetTypeButtonTextActive,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.inputHelp}>
          Type of vehicle used for the taxi service
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Maximum Passengers</Text>
        <TextInput
          style={styles.input}
          value={taxi_max_passengers ? String(taxi_max_passengers) : ''}
          onChangeText={(text) => setTaxiMaxPassengers?.(parseInt(text) || 0)}
          placeholder="e.g., 4"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Maximum number of passengers the vehicle can carry
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>License Number</Text>
        <TextInput
          style={styles.input}
          value={taxi_license_number || ''}
          onChangeText={setTaxiLicenseNumber}
          placeholder="e.g., TAXI-12345"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Your taxi/ride-share license number (for verification)
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Base Fare ({selectedCurrency.symbol})</Text>
        <TextInput
          style={styles.input}
          value={budgetMin || ''}
          onChangeText={setBudgetMin}
          placeholder="e.g., 5"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Base fare for taxi rides
        </Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  budgetTypeButtons: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  budgetTypeButton: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetTypeButtonActive: {
    backgroundColor: '#f25842',
    borderColor: '#f25842',
  },
  budgetTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  budgetTypeButtonTextActive: {
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
  },
  inputHelp: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
  },
})

