/**
 * Standard Pricing Component
 * Handles pricing for service and goods listings (fixed, range, price_list)
 */

import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ListingFormState, ListingFormActions, BudgetType } from '../useListingForm'
import { CURRENCIES, type Currency } from './types'

interface StandardPricingProps {
  formState: ListingFormState
  formActions: ListingFormActions
}

interface PriceListItem {
  id: string
  serviceName: string
  price: string
}

export function StandardPricing({ formState, formActions }: StandardPricingProps) {
  const {
    listing_type,
    budgetType,
    budgetMin,
    budgetMax,
    price_list,
    currency,
    // Subscription fields
    subscription_billing_cycle,
    subscription_trial_days,
    subscription_auto_renew,
    subscription_features,
    // Auction fields
    auction_start_price,
    auction_reserve_price,
    auction_end_time,
    auction_bid_increment,
    auction_buy_now_price,
  } = formState

  const {
    setBudgetType,
    setBudgetMin,
    setBudgetMax,
    setPriceList,
    setCurrency,
    // Subscription setters
    setSubscriptionBillingCycle,
    setSubscriptionTrialDays,
    setSubscriptionAutoRenew,
    setSubscriptionFeatures,
    // Auction setters
    setAuctionStartPrice,
    setAuctionReservePrice,
    setAuctionEndTime,
    setAuctionBidIncrement,
    setAuctionBuyNowPrice,
  } = formActions

  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false)
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(false)
  const [featureInput, setFeatureInput] = useState('')

  const selectedCurrency: Currency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]
  const isGoods = listing_type === 'goods'
  const isService = listing_type === 'service'

  // Initialize price list from form state or create a default one
  const [priceList, setPriceListLocal] = useState<PriceListItem[]>(() => {
    if (price_list && price_list.length > 0) {
      return price_list.map((item: any, index: number) => ({
        id: item.id || `price-${index}`,
        serviceName: item.serviceName || '',
        price: item.price || '',
      }))
    }
    return []
  })

  const handleAddService = () => {
    const newItem: PriceListItem = {
      id: `price-${Date.now()}`,
      serviceName: '',
      price: '',
    }
    const updated = [...priceList, newItem]
    setPriceListLocal(updated)
    setPriceList?.(updated)
  }

  const handleUpdateService = (id: string, field: 'serviceName' | 'price', value: string) => {
    const updated = priceList.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    )
    setPriceListLocal(updated)
    setPriceList?.(updated)
  }

  const handleRemoveService = (id: string) => {
    const updated = priceList.filter(item => item.id !== id)
    setPriceListLocal(updated)
    setPriceList?.(updated)
  }

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

      {/* Budget Type Selector */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Pricing Type</Text>
        <View style={styles.budgetTypeButtons}>
          {(
            isGoods 
              ? (['fixed', 'auction'] as const)
              : (['fixed', 'price_list'] as const)
          ).map((type) => (
            <Pressable
              key={type}
              style={[
                styles.budgetTypeButton,
                budgetType === type && styles.budgetTypeButtonActive,
              ]}
              onPress={() => setBudgetType(type as BudgetType)}
            >
              <Text
                style={[
                  styles.budgetTypeButtonText,
                  budgetType === type && styles.budgetTypeButtonTextActive,
                ]}
              >
                {type === 'price_list' ? 'Price List' : type === 'auction' ? 'Auction' : type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Fixed Price */}
      {budgetType === 'fixed' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Fixed Price ({selectedCurrency.symbol})</Text>
          <TextInput
            style={styles.input}
            value={budgetMin}
            onChangeText={setBudgetMin}
            placeholder="50"
            keyboardType="numeric"
            placeholderTextColor="#9ca3af"
          />
          <Text style={styles.inputHelp}>
            Set one price for your service
          </Text>
        </View>
      )}

      {/* Auction Pricing (Goods only) */}
      {isGoods && budgetType === 'auction' && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Starting Bid ({selectedCurrency.symbol})</Text>
            <TextInput
              style={styles.input}
              value={auction_start_price || ''}
              onChangeText={setAuctionStartPrice}
              placeholder="e.g., 50"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.inputHelp}>
              The initial bid price for your auction
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reserve Price ({selectedCurrency.symbol}) - Optional</Text>
            <TextInput
              style={styles.input}
              value={auction_reserve_price || ''}
              onChangeText={setAuctionReservePrice}
              placeholder="e.g., 100"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.inputHelp}>
              Minimum acceptable bid (auction won't sell below this)
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Buy Now Price ({selectedCurrency.symbol}) - Optional</Text>
            <TextInput
              style={styles.input}
              value={auction_buy_now_price || ''}
              onChangeText={setAuctionBuyNowPrice}
              placeholder="e.g., 200"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.inputHelp}>
              Instant purchase price (optional)
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bid Increment ({selectedCurrency.symbol})</Text>
            <TextInput
              style={styles.input}
              value={auction_bid_increment || ''}
              onChangeText={setAuctionBidIncrement}
              placeholder="e.g., 5"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.inputHelp}>
              Minimum bid increase amount
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Auction End Date & Time</Text>
            <TextInput
              style={styles.input}
              value={auction_end_time || ''}
              onChangeText={setAuctionEndTime}
              placeholder="YYYY-MM-DDTHH:MM (e.g., 2025-02-15T18:00)"
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.inputHelp}>
              When the auction will end (ISO format)
            </Text>
          </View>
        </>
      )}

      {/* Price List */}
      {budgetType === 'price_list' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Service Price List</Text>
          <Text style={styles.labelHelp}>
            Add individual services with their prices.
          </Text>
          {priceList.map((item, index) => (
            <View key={item.id} style={styles.priceListItem}>
              <View style={styles.priceItemNumber}>
                <Text style={styles.priceItemNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.priceItemInputs}>
                <TextInput
                  style={styles.serviceNameInput}
                  value={item.serviceName}
                  onChangeText={(text) => handleUpdateService(item.id, 'serviceName', text)}
                  placeholder="Service Name (e.g., Basic Cleaning)"
                  placeholderTextColor="#9ca3af"
                />
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencySymbol}>{selectedCurrency.symbol}</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={item.price}
                    onChangeText={(text) => handleUpdateService(item.id, 'price', text)}
                    placeholder="Price"
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
              <Pressable onPress={() => handleRemoveService(item.id)} style={styles.removePriceItemButton}>
                <Ionicons name="close-circle" size={24} color="#ef4444" />
              </Pressable>
            </View>
          ))}
          <Pressable onPress={handleAddService} style={styles.addServiceButton}>
            <Ionicons name="add-circle" size={24} color="#f25842" />
            <Text style={styles.addServiceButtonText}>Add Service</Text>
          </Pressable>
        </View>
      )}

      {/* Subscription Option (Service only) */}
      {isService && (
        <>
          <View style={styles.inputGroup}>
            <Pressable
              style={styles.checkboxContainer}
              onPress={() => setSubscriptionEnabled(!subscriptionEnabled)}
            >
              <View style={[styles.checkbox, subscriptionEnabled && styles.checkboxChecked]}>
                {subscriptionEnabled && <Ionicons name="checkmark" size={16} color="#ffffff" />}
              </View>
              <Text style={styles.checkboxLabel}>Enable Subscription Billing</Text>
            </Pressable>
            <Text style={styles.inputHelp}>
              Allow customers to subscribe for recurring service delivery
            </Text>
          </View>

          {subscriptionEnabled && (
            <>
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
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Subscription Price per Cycle ({selectedCurrency.symbol})</Text>
                <TextInput
                  style={styles.input}
                  value={budgetMin}
                  onChangeText={setBudgetMin}
                  placeholder="e.g., 29.99"
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                />
                <Text style={styles.inputHelp}>
                  Price charged per billing cycle
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Free Trial Days (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={subscription_trial_days ? String(subscription_trial_days) : ''}
                  onChangeText={(text) => setSubscriptionTrialDays?.(parseInt(text) || 0)}
                  placeholder="e.g., 7"
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                />
                <Text style={styles.inputHelp}>
                  Number of free trial days (leave empty for no trial)
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Features Included</Text>
                <View style={styles.featuresContainer}>
                  {(subscription_features || []).map((feature, index) => (
                    <View key={index} style={styles.featureTag}>
                      <Text style={styles.featureTagText}>{feature}</Text>
                      <Pressable onPress={() => {
                        const updated = (subscription_features || []).filter((_, i) => i !== index)
                        setSubscriptionFeatures?.(updated)
                      }}>
                        <Ionicons name="close-circle" size={18} color="#ef4444" />
                      </Pressable>
                    </View>
                  ))}
                </View>
                <View style={styles.featureInputContainer}>
                  <TextInput
                    style={styles.featureInput}
                    value={featureInput}
                    onChangeText={setFeatureInput}
                    placeholder="e.g., Weekly cleaning, Supplies included"
                    placeholderTextColor="#9ca3af"
                    onSubmitEditing={() => {
                      if (featureInput.trim()) {
                        const updated = [...(subscription_features || []), featureInput.trim()]
                        setSubscriptionFeatures?.(updated)
                        setFeatureInput('')
                      }
                    }}
                  />
                  <Pressable onPress={() => {
                    if (featureInput.trim()) {
                      const updated = [...(subscription_features || []), featureInput.trim()]
                      setSubscriptionFeatures?.(updated)
                      setFeatureInput('')
                    }
                  }} style={styles.addFeatureButton}>
                    <Ionicons name="add-circle" size={24} color="#f25842" />
                  </Pressable>
                </View>
                <Text style={styles.inputHelp}>
                  List what's included in the subscription
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Pressable
                  style={styles.checkboxContainer}
                  onPress={() => setSubscriptionAutoRenew?.(!subscription_auto_renew)}
                >
                  <View style={[styles.checkbox, subscription_auto_renew && styles.checkboxChecked]}>
                    {subscription_auto_renew && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Auto-renewal enabled</Text>
                </Pressable>
                <Text style={styles.inputHelp}>
                  Subscriptions will automatically renew unless cancelled
                </Text>
              </View>
            </>
          )}
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
  labelHelp: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
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
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceRangeInput: {
    flex: 1,
  },
  priceRangeSeparator: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  priceListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  priceItemNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f25842',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceItemNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  priceItemInputs: {
    flex: 1,
    gap: 8,
  },
  serviceNameInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
  },
  removePriceItemButton: {
    padding: 4,
  },
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
  },
  addServiceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
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
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  featureTagText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  featureInputContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  featureInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
  },
  addFeatureButton: {
    padding: 4,
  },
})

