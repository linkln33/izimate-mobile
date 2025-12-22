import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ListingFormState } from '../useListingForm'

interface Step4ReviewProps {
  formState: ListingFormState
  quota: any
}

export function Step4Review({ formState, quota }: Step4ReviewProps) {
  const {
    title,
    description,
    category,
    tags,
    photos,
    budgetType,
    budgetMin,
    budgetMax,
    urgency,
    preferredDate,
    locationAddress,
  } = formState

  return (
    <View>
      <Text style={styles.stepTitle}>Review & Submit</Text>

      {/* Basic Information Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Title:</Text>
          <Text style={styles.summaryValue}>{title || 'Not set'}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Category:</Text>
          <Text style={styles.summaryValue}>{category || 'Not set'}</Text>
        </View>
        {tags.length > 0 && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Tags:</Text>
            <Text style={styles.summaryValue}>{tags.join(', ')}</Text>
          </View>
        )}
        {photos.length > 0 && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Photos:</Text>
            <Text style={styles.summaryValue}>{`${photos.length} photo(s)`}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Budget & Timing</Text>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Budget Type:</Text>
          <Text style={styles.summaryValue}>
            {budgetType.charAt(0).toUpperCase() + budgetType.slice(1)}
          </Text>
        </View>
        {budgetMin && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Min Budget:</Text>
            <Text style={styles.summaryValue}>{`£${budgetMin}`}</Text>
          </View>
        )}
        {budgetMax && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Max Budget:</Text>
            <Text style={styles.summaryValue}>{`£${budgetMax}`}</Text>
          </View>
        )}
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Urgency:</Text>
          <Text style={styles.summaryValue}>
            {urgency === 'asap' ? 'ASAP' : urgency === 'this_week' ? 'This Week' : 'Flexible'}
          </Text>
        </View>
        {preferredDate && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Preferred Date:</Text>
            <Text style={styles.summaryValue}>{preferredDate}</Text>
          </View>
        )}
      </View>

      {/* Location Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Address:</Text>
          <Text style={styles.summaryValue}>{locationAddress || 'Not set'}</Text>
        </View>
      </View>

      {/* Quota Info */}
      {quota && (
        <View style={styles.quotaContainer}>
          <Text style={styles.quotaText}>
            Listings: {quota.current}/{quota.limit} ({quota.remaining} remaining)
          </Text>
          {quota.requiresBusinessVerification && (
            <Text style={styles.quotaWarning}>
              Business verification required for more listings
            </Text>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    width: 100,
  },
  summaryValue: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
  },
  quotaContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  quotaText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
  },
  quotaWarning: {
    fontSize: 12,
    color: '#92400e',
    marginTop: 8,
  },
})
