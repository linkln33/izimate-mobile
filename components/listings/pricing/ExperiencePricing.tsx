/**
 * Experience Pricing Component
 * Handles pricing configuration for experience listings
 */

import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ListingFormState, ListingFormActions } from '../useListingForm'
import { CURRENCIES, type Currency } from './types'

interface ExperiencePricingProps {
  formState: ListingFormState
  formActions: ListingFormActions
}

export function ExperiencePricing({ formState, formActions }: ExperiencePricingProps) {
  const {
    currency,
    experience_duration_hours,
    experience_max_participants,
    experience_min_age,
    experience_meeting_point,
  } = formState

  const {
    setExperienceDurationHours,
    setExperienceMaxParticipants,
    setExperienceMinAge,
    setExperienceMeetingPoint,
    setBudgetMin,
    setCurrency,
  } = formActions

  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false)
  const selectedCurrency: Currency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]

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
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Experience Details</Text>
        
        <Text style={styles.subLabel}>Duration (hours)</Text>
        <TextInput
          style={styles.input}
          value={experience_duration_hours ? String(experience_duration_hours) : ''}
          onChangeText={(text) => setExperienceDurationHours?.(parseInt(text) || 0)}
          placeholder="e.g., 2"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          How long does the experience last? (in hours)
        </Text>

        <Text style={[styles.subLabel, { marginTop: 16 }]}>Maximum Participants</Text>
        <TextInput
          style={styles.input}
          value={experience_max_participants ? String(experience_max_participants) : ''}
          onChangeText={(text) => setExperienceMaxParticipants?.(parseInt(text) || 0)}
          placeholder="e.g., 10"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Maximum number of participants for the experience.
        </Text>

        <Text style={[styles.subLabel, { marginTop: 16 }]}>Minimum Age</Text>
        <TextInput
          style={styles.input}
          value={experience_min_age ? String(experience_min_age) : ''}
          onChangeText={(text) => setExperienceMinAge?.(parseInt(text) || 0)}
          placeholder="e.g., 18"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Minimum age requirement for participants (optional).
        </Text>

        <Text style={[styles.subLabel, { marginTop: 16 }]}>Meeting Point</Text>
        <TextInput
          style={styles.input}
          value={experience_meeting_point || ''}
          onChangeText={setExperienceMeetingPoint}
          placeholder="e.g., Eiffel Tower entrance"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Where will participants meet for the experience?
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Price per Person ({selectedCurrency.symbol})</Text>
        <TextInput
          style={styles.input}
          value={formState.budgetMin || ''}
          onChangeText={setBudgetMin}
          placeholder="e.g., 50"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Price per participant for the experience.
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
    marginBottom: 12,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: 8,
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

