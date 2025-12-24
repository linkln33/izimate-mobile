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
  } = formState

  const {
    setBudgetType,
    setBudgetMin,
    setBudgetMax,
    setUrgency,
    setPreferredDate,
    setPriceList,
  } = formActions

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
          <Text style={styles.label}>Fixed Price (£)</Text>
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
            <Text style={styles.label}>Minimum Price (£)</Text>
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
            <Text style={styles.label}>Maximum Price (£)</Text>
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
                  <Text style={styles.currencySymbol}>£</Text>
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
