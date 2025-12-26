/**
 * Space Sharing Pricing Component
 * Handles pricing configuration for space sharing listings
 */

import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native'
import type { ListingFormState, ListingFormActions } from '../useListingForm'
import { CURRENCIES, type Currency } from './types'

interface SpaceSharingPricingProps {
  formState: ListingFormState
  formActions: ListingFormActions
}

export function SpaceSharingPricing({ formState, formActions }: SpaceSharingPricingProps) {
  const {
    currency,
    space_type,
    space_capacity,
    space_hourly_rate,
    space_daily_rate,
  } = formState

  const {
    setSpaceType,
    setSpaceCapacity,
    setSpaceHourlyRate,
    setSpaceDailyRate,
  } = formActions

  const selectedCurrency: Currency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]

  return (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Space Type</Text>
        <View style={styles.budgetTypeButtons}>
          {(['parking', 'storage', 'workspace', 'event_venue', 'studio', 'kitchen', 'couchsurfing', 'other'] as const).map((type) => (
            <Pressable
              key={type}
              style={[
                styles.budgetTypeButton,
                space_type === type && styles.budgetTypeButtonActive,
              ]}
              onPress={() => setSpaceType?.(type)}
            >
              <Text
                style={[
                  styles.budgetTypeButtonText,
                  space_type === type && styles.budgetTypeButtonTextActive,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.inputHelp}>
          What kind of space are you sharing?
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Capacity</Text>
        <TextInput
          style={styles.input}
          value={space_capacity ? String(space_capacity) : ''}
          onChangeText={(text) => setSpaceCapacity?.(parseInt(text) || 0)}
          placeholder="e.g., 4 people, 2 cars"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Maximum capacity of the space (people, cars, items, etc.)
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Hourly Rate ({selectedCurrency.symbol})</Text>
        <TextInput
          style={styles.input}
          value={space_hourly_rate || ''}
          onChangeText={setSpaceHourlyRate}
          placeholder="e.g., 10"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Price per hour for the space (optional)
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Daily Rate ({selectedCurrency.symbol})</Text>
        <TextInput
          style={styles.input}
          value={space_daily_rate || ''}
          onChangeText={setSpaceDailyRate}
          placeholder="e.g., 50"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Price per day for the space (optional)
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

