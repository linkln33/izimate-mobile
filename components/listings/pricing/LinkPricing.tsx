/**
 * Link Pricing Component
 * Handles configuration for link listings (affiliate, redirect, short_link)
 */

import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native'
import type { ListingFormState, ListingFormActions } from '../useListingForm'

interface LinkPricingProps {
  formState: ListingFormState
  formActions: ListingFormActions
}

export function LinkPricing({ formState, formActions }: LinkPricingProps) {
  const {
    link_url,
    link_type,
  } = formState

  const {
    setLinkUrl,
    setLinkType,
  } = formActions

  return (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>URL</Text>
        <TextInput
          style={styles.input}
          value={link_url || ''}
          onChangeText={setLinkUrl}
          placeholder="https://example.com/affiliate-product"
          keyboardType="url"
          autoCapitalize="none"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          The URL this listing will redirect to
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Link Type</Text>
        <View style={styles.budgetTypeButtons}>
          {(['affiliate', 'redirect', 'short_link'] as const).map((type) => (
            <Pressable
              key={type}
              style={[
                styles.budgetTypeButton,
                link_type === type && styles.budgetTypeButtonActive,
              ]}
              onPress={() => setLinkType?.(type)}
            >
              <Text
                style={[
                  styles.budgetTypeButtonText,
                  link_type === type && styles.budgetTypeButtonTextActive,
                ]}
              >
                {type === 'short_link' ? 'Short Link' : type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.inputHelp}>
          What kind of link is this?
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

