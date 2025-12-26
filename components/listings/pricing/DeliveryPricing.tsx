/**
 * Delivery Pricing Component
 * Handles pricing configuration for delivery listings
 */

import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native'
import type { ListingFormState, ListingFormActions } from '../useListingForm'
import { CURRENCIES, type Currency } from './types'

interface DeliveryPricingProps {
  formState: ListingFormState
  formActions: ListingFormActions
}

export function DeliveryPricing({ formState, formActions }: DeliveryPricingProps) {
  const {
    currency,
    delivery_type,
    delivery_radius_km,
    delivery_fee_structure,
    delivery_estimated_time,
    budgetMin,
  } = formState

  const {
    setDeliveryType,
    setDeliveryRadiusKm,
    setDeliveryFeeStructure,
    setDeliveryEstimatedTime,
    setBudgetMin,
  } = formActions

  const selectedCurrency: Currency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]

  return (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Delivery Type</Text>
        <View style={styles.budgetTypeButtons}>
          {(['food', 'grocery', 'package', 'medicine', 'other'] as const).map((type) => (
            <Pressable
              key={type}
              style={[
                styles.budgetTypeButton,
                delivery_type === type && styles.budgetTypeButtonActive,
              ]}
              onPress={() => setDeliveryType?.(type)}
            >
              <Text
                style={[
                  styles.budgetTypeButtonText,
                  delivery_type === type && styles.budgetTypeButtonTextActive,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.inputHelp}>
          What kind of delivery service do you offer?
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Service Radius (km)</Text>
        <TextInput
          style={styles.input}
          value={delivery_radius_km ? String(delivery_radius_km) : ''}
          onChangeText={(text) => setDeliveryRadiusKm?.(parseInt(text) || 0)}
          placeholder="e.g., 10"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Maximum delivery distance in kilometers
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Delivery Fee Structure</Text>
        <View style={styles.budgetTypeButtons}>
          {(['fixed', 'distance_based', 'weight_based'] as const).map((structure) => (
            <Pressable
              key={structure}
              style={[
                styles.budgetTypeButton,
                delivery_fee_structure === structure && styles.budgetTypeButtonActive,
              ]}
              onPress={() => setDeliveryFeeStructure?.(structure)}
            >
              <Text
                style={[
                  styles.budgetTypeButtonText,
                  delivery_fee_structure === structure && styles.budgetTypeButtonTextActive,
                ]}
              >
                {structure === 'distance_based' ? 'Per KM' : structure === 'weight_based' ? 'Per Weight' : 'Fixed'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.inputHelp}>
          How do you calculate delivery fees?
        </Text>
      </View>

      {delivery_fee_structure === 'fixed' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Fixed Delivery Fee ({selectedCurrency.symbol})</Text>
          <TextInput
            style={styles.input}
            value={budgetMin || ''}
            onChangeText={setBudgetMin}
            placeholder="e.g., 5"
            keyboardType="numeric"
            placeholderTextColor="#9ca3af"
          />
          <Text style={styles.inputHelp}>
            Fixed delivery fee amount
          </Text>
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Estimated Delivery Time (minutes)</Text>
        <TextInput
          style={styles.input}
          value={delivery_estimated_time ? String(delivery_estimated_time) : ''}
          onChangeText={(text) => setDeliveryEstimatedTime?.(parseInt(text) || 0)}
          placeholder="e.g., 30"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Average delivery time in minutes
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

