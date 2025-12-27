/**
 * Gated Content Pricing Component
 * Handles flexible pricing configuration for gated content (Patreon-like)
 * Users can set single price or create custom tiers
 */

import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ListingFormState, ListingFormActions } from '../useListingForm'
import { CURRENCIES, type Currency } from './types'

interface GatedContentPricingProps {
  formState: ListingFormState
  formActions: ListingFormActions
}

interface ContentTier {
  id: string
  name: string
  price: string
  billing_cycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  description?: string
  features?: string[]
}

export function GatedContentPricing({ formState, formActions }: GatedContentPricingProps) {
  const { currency } = formState
  const { setCurrency } = formActions

  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false)
  const [hasTiers, setHasTiers] = useState(false)
  const [singlePrice, setSinglePrice] = useState('')
  const [singleBillingCycle, setSingleBillingCycle] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [tiers, setTiers] = useState<ContentTier[]>([])
  const [trialDays, setTrialDays] = useState('')
  const [autoRenew, setAutoRenew] = useState(true)

  const selectedCurrency: Currency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]

  const handleAddTier = () => {
    const newTier: ContentTier = {
      id: `tier-${Date.now()}`,
      name: '',
      price: '',
      billing_cycle: 'monthly',
      description: '',
      features: [],
    }
    setTiers([...tiers, newTier])
  }

  const handleUpdateTier = (id: string, field: keyof ContentTier, value: any) => {
    setTiers(tiers.map(tier => 
      tier.id === id ? { ...tier, [field]: value } : tier
    ))
  }

  const handleRemoveTier = (id: string) => {
    setTiers(tiers.filter(tier => tier.id !== id))
  }

  const handleAddFeature = (tierId: string, feature: string) => {
    if (!feature.trim()) return
    setTiers(tiers.map(tier => 
      tier.id === tierId 
        ? { ...tier, features: [...(tier.features || []), feature.trim()] }
        : tier
    ))
  }

  const handleRemoveFeature = (tierId: string, featureIndex: number) => {
    setTiers(tiers.map(tier => 
      tier.id === tierId 
        ? { ...tier, features: tier.features?.filter((_, i) => i !== featureIndex) || [] }
        : tier
    ))
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
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

      {/* Pricing Structure Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Pricing Structure</Text>
        <View style={styles.budgetTypeButtons}>
          <Pressable
            style={[
              styles.budgetTypeButton,
              !hasTiers && styles.budgetTypeButtonActive,
            ]}
            onPress={() => setHasTiers(false)}
          >
            <Text
              style={[
                styles.budgetTypeButtonText,
                !hasTiers && styles.budgetTypeButtonTextActive,
              ]}
            >
              Single Price
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.budgetTypeButton,
              hasTiers && styles.budgetTypeButtonActive,
            ]}
            onPress={() => setHasTiers(true)}
          >
            <Text
              style={[
                styles.budgetTypeButtonText,
                hasTiers && styles.budgetTypeButtonTextActive,
              ]}
            >
              Custom Tiers
            </Text>
          </Pressable>
        </View>
        <Text style={styles.inputHelp}>
          Choose single pricing or create multiple membership tiers
        </Text>
      </View>

      {/* Single Price Configuration */}
      {!hasTiers && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subscription Price ({selectedCurrency.symbol})</Text>
            <TextInput
              style={styles.input}
              value={singlePrice}
              onChangeText={setSinglePrice}
              placeholder="e.g., 9.99"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.inputHelp}>
              Monthly subscription price
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
                    singleBillingCycle === cycle && styles.budgetTypeButtonActive,
                  ]}
                  onPress={() => setSingleBillingCycle(cycle)}
                >
                  <Text
                    style={[
                      styles.budgetTypeButtonText,
                      singleBillingCycle === cycle && styles.budgetTypeButtonTextActive,
                    ]}
                  >
                    {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      )}

      {/* Custom Tiers Configuration */}
      {hasTiers && (
        <>
          <View style={styles.inputGroup}>
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>Membership Tiers</Text>
              <Pressable onPress={handleAddTier} style={styles.addButton}>
                <Ionicons name="add-circle" size={24} color="#f25842" />
                <Text style={styles.addButtonText}>Add Tier</Text>
              </Pressable>
            </View>
            <Text style={styles.inputHelp}>
              Create custom membership tiers with different prices and benefits
            </Text>
          </View>

          {tiers.map((tier, index) => (
            <View key={tier.id} style={styles.tierCard}>
              <View style={styles.tierHeader}>
                <Text style={styles.tierNumber}>Tier {index + 1}</Text>
                <Pressable onPress={() => handleRemoveTier(tier.id)}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tier Name</Text>
                <TextInput
                  style={styles.input}
                  value={tier.name}
                  onChangeText={(text) => handleUpdateTier(tier.id, 'name', text)}
                  placeholder="e.g., Supporter, VIP, Premium"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Price ({selectedCurrency.symbol})</Text>
                <TextInput
                  style={styles.input}
                  value={tier.price}
                  onChangeText={(text) => handleUpdateTier(tier.id, 'price', text)}
                  placeholder="e.g., 9.99"
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Billing Cycle</Text>
                <View style={styles.budgetTypeButtons}>
                  {(['weekly', 'monthly', 'quarterly', 'yearly'] as const).map((cycle) => (
                    <Pressable
                      key={cycle}
                      style={[
                        styles.budgetTypeButton,
                        tier.billing_cycle === cycle && styles.budgetTypeButtonActive,
                      ]}
                      onPress={() => handleUpdateTier(tier.id, 'billing_cycle', cycle)}
                    >
                      <Text
                        style={[
                          styles.budgetTypeButtonText,
                          tier.billing_cycle === cycle && styles.budgetTypeButtonTextActive,
                        ]}
                      >
                        {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={tier.description || ''}
                  onChangeText={(text) => handleUpdateTier(tier.id, 'description', text)}
                  placeholder="What's included in this tier?"
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
          ))}

          {tiers.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="layers-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No tiers yet</Text>
              <Text style={styles.emptyStateSubtext}>Click "Add Tier" to create your first membership tier</Text>
            </View>
          )}
        </>
      )}

      {/* Subscription Options */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Free Trial Days (Optional)</Text>
        <TextInput
          style={styles.input}
          value={trialDays}
          onChangeText={setTrialDays}
          placeholder="e.g., 7"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Number of free trial days for new subscribers (leave empty for no trial)
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Pressable
          style={styles.checkboxContainer}
          onPress={() => setAutoRenew(!autoRenew)}
        >
          <View style={[styles.checkbox, autoRenew && styles.checkboxChecked]}>
            {autoRenew && <Ionicons name="checkmark" size={16} color="#ffffff" />}
          </View>
          <Text style={styles.checkboxLabel}>Auto-renewal enabled</Text>
        </Pressable>
        <Text style={styles.inputHelp}>
          Subscriptions will automatically renew unless cancelled
        </Text>
      </View>
    </ScrollView>
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputHelp: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f25842',
  },
  tierCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tierNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 6,
    textAlign: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#f25842',
    borderColor: '#f25842',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
})
