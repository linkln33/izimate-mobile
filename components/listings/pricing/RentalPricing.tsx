/**
 * Rental Pricing Component
 * Handles pricing configuration for rental listings
 */

import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ListingFormState, ListingFormActions } from '../useListingForm'
import { CURRENCIES, type Currency } from './types'

interface RentalPricingProps {
  formState: ListingFormState
  formActions: ListingFormActions
}

export function RentalPricing({ formState, formActions }: RentalPricingProps) {
  const {
    currency,
    rental_duration_type,
    rental_rate_hourly,
    rental_rate_daily,
    rental_rate_weekly,
    rental_rate_monthly,
    security_deposit,
    cleaning_fee,
    space_type,
  } = formState

  const {
    setRentalDurationType,
    setRentalRateHourly,
    setRentalRateDaily,
    setRentalRateWeekly,
    setRentalRateMonthly,
    setSecurityDeposit,
    setCleaningFee,
    setCurrency,
    setSpaceType,
  } = formActions

  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false)
  const selectedCurrency: Currency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]
  const isCouchsurfing = space_type === 'couchsurfing'

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

      {/* Rental Type Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Rental Type</Text>
        <View style={styles.budgetTypeButtons}>
          <Pressable
            style={[
              styles.budgetTypeButton,
              !isCouchsurfing && styles.budgetTypeButtonActive,
            ]}
            onPress={() => setSpaceType?.('parking')}
          >
            <Text
              style={[
                styles.budgetTypeButtonText,
                !isCouchsurfing && styles.budgetTypeButtonTextActive,
              ]}
            >
              Standard Rental
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.budgetTypeButton,
              isCouchsurfing && styles.budgetTypeButtonActive,
            ]}
            onPress={() => setSpaceType?.('couchsurfing')}
          >
            <Text
              style={[
                styles.budgetTypeButtonText,
                isCouchsurfing && styles.budgetTypeButtonTextActive,
              ]}
            >
              Couch-surfing (Exchange)
            </Text>
          </Pressable>
        </View>
        <Text style={styles.inputHelp}>
          {isCouchsurfing 
            ? 'Couch-surfing allows users to exchange accommodation or services'
            : 'Standard rental with fixed pricing'}
        </Text>
      </View>

      {!isCouchsurfing && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Rental Duration Type</Text>
        <View style={styles.budgetTypeButtons}>
          {(['hourly', 'daily', 'weekly', 'monthly'] as const).map((type) => (
            <Pressable
              key={type}
              style={[
                styles.budgetTypeButton,
                rental_duration_type === type && styles.budgetTypeButtonActive,
              ]}
              onPress={() => setRentalDurationType?.(type)}
            >
              <Text
                style={[
                  styles.budgetTypeButtonText,
                  rental_duration_type === type && styles.budgetTypeButtonTextActive,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Rental Rates */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Rental Rates ({selectedCurrency.symbol})</Text>
        
        {rental_duration_type === 'hourly' && (
          <TextInput
            style={styles.input}
            value={rental_rate_hourly || ''}
            onChangeText={setRentalRateHourly}
            placeholder="e.g., 25"
            keyboardType="numeric"
            placeholderTextColor="#9ca3af"
          />
        )}
        
        {rental_duration_type === 'daily' && (
          <TextInput
            style={styles.input}
            value={rental_rate_daily || ''}
            onChangeText={setRentalRateDaily}
            placeholder="e.g., 50"
            keyboardType="numeric"
            placeholderTextColor="#9ca3af"
          />
        )}
        
        {rental_duration_type === 'weekly' && (
          <TextInput
            style={styles.input}
            value={rental_rate_weekly || ''}
            onChangeText={setRentalRateWeekly}
            placeholder="e.g., 300"
            keyboardType="numeric"
            placeholderTextColor="#9ca3af"
          />
        )}
        
        {rental_duration_type === 'monthly' && (
          <TextInput
            style={styles.input}
            value={rental_rate_monthly || ''}
            onChangeText={setRentalRateMonthly}
            placeholder="e.g., 1000"
            keyboardType="numeric"
            placeholderTextColor="#9ca3af"
          />
        )}
        
        <Text style={styles.inputHelp}>
          Set your {rental_duration_type} rental rate
        </Text>
      </View>

      {/* Security Deposit */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Security Deposit ({selectedCurrency.symbol})</Text>
        <TextInput
          style={styles.input}
          value={security_deposit || ''}
          onChangeText={setSecurityDeposit}
          placeholder="e.g., 200"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Amount held as security deposit (optional)
        </Text>
      </View>

      {/* Cleaning Fee */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Cleaning Fee ({selectedCurrency.symbol})</Text>
        <TextInput
          style={styles.input}
          value={cleaning_fee || ''}
          onChangeText={setCleaningFee}
          placeholder="e.g., 50"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          One-time cleaning fee (optional)
        </Text>
      </View>
        </>
      )}

      {isCouchsurfing && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Couch-surfing Exchange</Text>
          <Text style={styles.inputHelp}>
            Couch-surfing mode enabled. Users can request to exchange accommodation or services.
            Pricing is flexible and can be negotiated between parties.
          </Text>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
            <Text style={styles.infoBoxText}>
              In couch-surfing mode, hosts can offer free accommodation in exchange for services,
              cultural exchange, or future reciprocal stays. Pricing is optional and negotiable.
            </Text>
          </View>
        </View>
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
    minWidth: 80,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 12,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
})

