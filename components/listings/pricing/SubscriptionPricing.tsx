/**
 * Subscription Pricing Component
 * Handles pricing configuration for subscription listings
 */

import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ListingFormState, ListingFormActions } from '../useListingForm'
import { CURRENCIES, type Currency } from './types'

interface SubscriptionPricingProps {
  formState: ListingFormState
  formActions: ListingFormActions
}

export function SubscriptionPricing({ formState, formActions }: SubscriptionPricingProps) {
  const {
    currency,
    subscription_billing_cycle,
    subscription_trial_days,
    subscription_auto_renew,
    budgetMin,
  } = formState

  const {
    setSubscriptionBillingCycle,
    setSubscriptionTrialDays,
    setSubscriptionAutoRenew,
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
        <Text style={styles.label}>Billing Cycle</Text>
        <View style={styles.budgetTypeButtons}>
          {(['weekly', 'monthly', 'quarterly', 'yearly'] as const).map((cycle) => (
            <Pressable
              key={cycle}
              style={[
                styles.budgetTypeButton,
                subscription_billing_cycle === cycle && styles.budgetTypeButtonActive,
              ]}
              onPress={() => setSubscriptionBillingCycle?.(cycle)}
            >
              <Text
                style={[
                  styles.budgetTypeButtonText,
                  subscription_billing_cycle === cycle && styles.budgetTypeButtonTextActive,
                ]}
              >
                {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.inputHelp}>
          Select the billing cycle for your subscription
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Price per {subscription_billing_cycle || 'month'} ({selectedCurrency.symbol})</Text>
        <TextInput
          style={styles.input}
          value={budgetMin || ''}
          onChangeText={setBudgetMin}
          placeholder="e.g., 19.95"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Set the price for your subscription
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Free Trial Days</Text>
        <TextInput
          style={styles.input}
          value={subscription_trial_days ? String(subscription_trial_days) : ''}
          onChangeText={(text) => setSubscriptionTrialDays?.(parseInt(text) || 0)}
          placeholder="e.g., 7"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Number of free trial days offered (optional)
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Auto-Renewal</Text>
          <Pressable
            style={[
              styles.switch,
              subscription_auto_renew && styles.switchActive,
            ]}
            onPress={() => setSubscriptionAutoRenew?.(!subscription_auto_renew)}
          >
            <View style={[
              styles.switchThumb,
              subscription_auto_renew && styles.switchThumbActive,
            ]} />
          </Pressable>
        </View>
        <Text style={styles.inputHelp}>
          Automatically renew subscription at the end of each billing cycle
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
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e5e7eb',
    padding: 3,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: '#f25842',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
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

