import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ListingFormState, ListingFormActions, BudgetType } from '../useListingForm'

interface Step2BudgetProps {
  formState: ListingFormState
  formActions: ListingFormActions
}

interface PriceListItem {
  id: string
  serviceName: string
  price: string
}

export function Step2Budget({ formState, formActions }: Step2BudgetProps) {
  const {
    budgetType,
    budgetMin,
    budgetMax,
    urgency,
    preferredDate,
    price_list,
    currency,
  } = formState

  const {
    setBudgetType,
    setBudgetMin,
    setBudgetMax,
    setUrgency,
    setPreferredDate,
    setPriceList,
    setCurrency,
  } = formActions

  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false)

  // Comprehensive list of currencies
  const currencies = [
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
    { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
    { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
    { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
    { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
    { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
    { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
    { code: 'THB', symbol: '฿', name: 'Thai Baht' },
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
    { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
    { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
    { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
    { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
    { code: 'ARS', symbol: '$', name: 'Argentine Peso' },
    { code: 'CLP', symbol: '$', name: 'Chilean Peso' },
    { code: 'COP', symbol: '$', name: 'Colombian Peso' },
    { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol' },
    { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
    { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
    { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
    { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee' },
  ]

  const selectedCurrency = currencies.find(c => c.code === currency) || currencies[0]

  // Initialize price list from form state or create a default one
  const [priceList, setPriceListLocal] = useState<PriceListItem[]>(() => {
    if (price_list && price_list.length > 0) {
      return price_list.map((item: any, index: number) => ({
        id: item.id || `price-${index}`,
        serviceName: item.serviceName || '',
        price: item.price?.toString() || '',
      }));
    }
    return [{ id: 'price-1', serviceName: '', price: '' }];
  });

  const handleAddService = () => {
    const newItem: PriceListItem = {
      id: `price-${Date.now()}`,
      serviceName: '',
      price: '',
    };
    const updated = [...priceList, newItem];
    setPriceListLocal(updated);
    setPriceList?.(updated);
  };

  const handleRemoveService = (id: string) => {
    const updated = priceList.filter(item => item.id !== id);
    setPriceListLocal(updated);
    setPriceList?.(updated);
  };

  const handleUpdateService = (id: string, field: 'serviceName' | 'price', value: string) => {
    const updated = priceList.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    setPriceListLocal(updated);
    setPriceList?.(updated);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Services & Pricing</Text>
      <Text style={styles.stepSubtitle}>
        Choose how you want to price your services
      </Text>

      {/* Currency Dropdown */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Currency</Text>
        <Pressable
          style={styles.currencyDropdownButton}
          onPress={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
        >
          <Text style={styles.currencyDropdownText}>
            {selectedCurrency ? `${selectedCurrency.symbol} ${selectedCurrency.code} - ${selectedCurrency.name}` : 'Select currency'}
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
              {currencies.map((curr) => (
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
          {(['fixed', 'range', 'price_list'] as const).map((type) => (
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
                {type === 'price_list' ? 'Price List' : type.charAt(0).toUpperCase() + type.slice(1)}
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

      {/* Range */}
      {budgetType === 'range' && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Minimum Price ({selectedCurrency.symbol})</Text>
            <TextInput
              style={styles.input}
              value={budgetMin}
              onChangeText={setBudgetMin}
              placeholder="50"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
          </View>
        <View style={styles.inputGroup}>
            <Text style={styles.label}>Maximum Price ({selectedCurrency.symbol})</Text>
          <TextInput
            style={styles.input}
            value={budgetMax}
            onChangeText={setBudgetMax}
              placeholder="100"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.inputHelp}>
              Set a price range for your services
            </Text>
          </View>
        </>
      )}

      {/* Price List */}
      {budgetType === 'price_list' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Service Price List</Text>
          <Text style={styles.labelHelp}>
            Add each service you provide with its individual price
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
                  onChangeText={(value) => handleUpdateService(item.id, 'serviceName', value)}
                  placeholder="e.g., Haircut, Manicure..."
                  placeholderTextColor="#9ca3af"
                />
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencySymbol}>{selectedCurrency.symbol}</Text>
                  <TextInput
                    style={styles.priceInputField}
                    value={item.price}
                    onChangeText={(value) => handleUpdateService(item.id, 'price', value)}
                    placeholder="50"
            keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
              {priceList.length > 1 && (
                <Pressable
                  style={styles.removeButton}
                  onPress={() => handleRemoveService(item.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </Pressable>
              )}
            </View>
          ))}

          <Pressable style={styles.addButton} onPress={handleAddService}>
            <Ionicons name="add-circle" size={20} color="#3b82f6" />
            <Text style={styles.addButtonText}>Add Another Service</Text>
          </Pressable>
        </View>
      )}

      {/* Urgency */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Urgency (Optional)</Text>
        <View style={styles.urgencyButtons}>
          {(['asap', 'this_week', 'flexible'] as const).map((urg) => (
            <Pressable
              key={urg}
              style={[
                styles.urgencyButton,
                urgency === urg && styles.urgencyButtonActive,
              ]}
              onPress={() => setUrgency(urg)}
            >
              <Text
                style={[
                  styles.urgencyButtonText,
                  urgency === urg && styles.urgencyButtonTextActive,
                ]}
              >
                {urg === 'asap' ? 'ASAP' : urg === 'this_week' ? 'This Week' : 'Flexible'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Preferred Date */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Preferred Date (Optional)</Text>
        <TextInput
          style={styles.input}
          value={preferredDate}
          onChangeText={setPreferredDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9ca3af"
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  inputHelp: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
  budgetTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  budgetTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  budgetTypeButtonActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#f25842',
  },
  budgetTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  labelHelp: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  priceListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  priceItemNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceItemNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  priceItemInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  serviceNameInput: {
    flex: 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    outlineStyle: 'none',
  },
  priceInputContainer: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 4,
  },
  priceInputField: {
    flex: 1,
    minWidth: 60,
    paddingVertical: 16,
    paddingLeft: 4,
    fontSize: 16,
    color: '#1a1a1a',
    outlineStyle: 'none',
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
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
  addButtonText: {
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
  urgencyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  urgencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  urgencyButtonActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#f25842',
  },
  urgencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  urgencyButtonTextActive: {
    color: '#f25842',
    fontWeight: '600',
  },
})
