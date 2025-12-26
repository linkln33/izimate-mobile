/**
 * Fundraising Pricing Component
 * Handles pricing configuration for fundraising listings
 */

import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ListingFormState, ListingFormActions } from '../useListingForm'
import { CURRENCIES, type Currency } from './types'

interface FundraisingPricingProps {
  formState: ListingFormState
  formActions: ListingFormActions
}

export function FundraisingPricing({ formState, formActions }: FundraisingPricingProps) {
  const {
    currency,
    fundraising_goal,
    fundraising_end_date,
    fundraising_category,
    fundraising_beneficiary,
  } = formState

  const {
    setFundraisingGoal,
    setFundraisingEndDate,
    setFundraisingCategory,
    setFundraisingBeneficiary,
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
        <Text style={styles.label}>Fundraising Goal ({selectedCurrency.symbol})</Text>
        <TextInput
          style={styles.input}
          value={fundraising_goal || ''}
          onChangeText={setFundraisingGoal}
          placeholder="e.g., 5000"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          The total amount you aim to raise
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.budgetTypeButtons}>
          {(['charity', 'personal', 'business', 'event', 'medical', 'education', 'other'] as const).map((category) => (
            <Pressable
              key={category}
              style={[
                styles.budgetTypeButton,
                fundraising_category === category && styles.budgetTypeButtonActive,
              ]}
              onPress={() => setFundraisingCategory?.(category)}
            >
              <Text
                style={[
                  styles.budgetTypeButtonText,
                  fundraising_category === category && styles.budgetTypeButtonTextActive,
                ]}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Beneficiary</Text>
        <TextInput
          style={styles.input}
          value={fundraising_beneficiary || ''}
          onChangeText={setFundraisingBeneficiary}
          placeholder="e.g., Charity Name, Your Name"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Who will receive the raised funds?
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>End Date</Text>
        <TextInput
          style={styles.input}
          value={fundraising_end_date || ''}
          onChangeText={setFundraisingEndDate}
          placeholder="YYYY-MM-DD (e.g., 2024-12-31)"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          When the fundraising campaign ends
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

