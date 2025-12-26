/**
 * Transportation Pricing Component
 * Unified component for Delivery and Taxi services
 */

import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ListingFormState, ListingFormActions } from '../useListingForm'
import { CURRENCIES, type Currency } from './types'

interface TransportationPricingProps {
  formState: ListingFormState
  formActions: ListingFormActions
}

export function TransportationPricing({ formState, formActions }: TransportationPricingProps) {
  const {
    currency,
    delivery_type,
    delivery_radius_km,
    delivery_fee_structure,
    delivery_estimated_time,
    taxi_vehicle_type,
    taxi_max_passengers,
    taxi_license_number,
    budgetMin,
  } = formState

  const {
    setDeliveryType,
    setDeliveryRadiusKm,
    setDeliveryFeeStructure,
    setDeliveryEstimatedTime,
    setTaxiVehicleType,
    setTaxiMaxPassengers,
    setTaxiLicenseNumber,
    setBudgetMin,
    setCurrency,
  } = formActions

  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false)
  const selectedCurrency: Currency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]
  
  // Determine if this is delivery or taxi based on category or delivery_type
  // If delivery_type is set, it's delivery. If taxi_vehicle_type is set, it's taxi.
  // Otherwise, let user choose
  const [transportationType, setTransportationType] = useState<'delivery' | 'taxi'>(
    delivery_type ? 'delivery' : taxi_vehicle_type ? 'taxi' : 'delivery'
  )

  return (
    <>
      {/* Currency Dropdown */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Currency</Text>
        <Pressable
          style={styles.currencyDropdownButton}
          onPress={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
        >
          <Text style={styles.currencyDropdownText}>
            {selectedCurrency.symbol} {selectedCurrency.code} - {selectedCurrency.name}
          </Text>
          <Ionicons
            name={currencyDropdownOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#6b7280"
          />
        </Pressable>
        {currencyDropdownOpen && (
          <View style={styles.currencyDropdownMenu}>
            <ScrollView style={styles.currencyDropdownScroll} nestedScrollEnabled={true}>
              {CURRENCIES.map((curr) => (
                <Pressable
                  key={curr.code}
                  style={[
                    styles.currencyDropdownItem,
                    currency === curr.code && styles.currencyDropdownItemActive,
                  ]}
                  onPress={() => {
                    setCurrency?.(curr.code)
                    setCurrencyDropdownOpen(false)
                  }}
                >
                  <Text
                    style={[
                      styles.currencyDropdownItemText,
                      currency === curr.code && styles.currencyDropdownItemTextActive,
                    ]}
                  >
                    {curr.symbol} {curr.code} - {curr.name}
                  </Text>
                  {currency === curr.code && (
                    <Ionicons name="checkmark" size={20} color="#f25842" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
        <Text style={styles.inputHelp}>
          Select the currency for your pricing
        </Text>
      </View>
      {/* Transportation Type Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Transportation Type</Text>
        <View style={styles.budgetTypeButtons}>
          {(['delivery', 'taxi'] as const).map((type) => (
            <Pressable
              key={type}
              style={[
                styles.budgetTypeButton,
                transportationType === type && styles.budgetTypeButtonActive,
              ]}
              onPress={() => {
                setTransportationType(type)
                // Clear fields when switching
                if (type === 'delivery') {
                  setTaxiVehicleType?.(undefined)
                  setTaxiMaxPassengers?.(undefined)
                  setTaxiLicenseNumber?.(undefined)
                } else {
                  setDeliveryType?.(undefined)
                  setDeliveryRadiusKm?.(undefined)
                  setDeliveryFeeStructure?.(undefined)
                  setDeliveryEstimatedTime?.(undefined)
                }
              }}
            >
              <Text
                style={[
                  styles.budgetTypeButtonText,
                  transportationType === type && styles.budgetTypeButtonTextActive,
                ]}
              >
                {type === 'delivery' ? 'Delivery' : 'Taxi/Rideshare'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Delivery-specific fields */}
      {transportationType === 'delivery' && (
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
          </View>
        </>
      )}

      {/* Taxi-specific fields */}
      {transportationType === 'taxi' && (
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
          </View>
        </>
      )}
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
  currencyDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  currencyDropdownText: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  currencyDropdownMenu: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  currencyDropdownScroll: {
    maxHeight: 300,
  },
  currencyDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  currencyDropdownItemActive: {
    backgroundColor: '#fee2e2',
  },
  currencyDropdownItemText: {
    fontSize: 15,
    color: '#1a1a1a',
    flex: 1,
  },
  currencyDropdownItemTextActive: {
    color: '#f25842',
    fontWeight: '600',
  },
})

