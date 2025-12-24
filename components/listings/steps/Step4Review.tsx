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
    currency,
    price_list,
    booking_enabled,
    service_name,
    cancellation_hours,
    cancellation_fee_enabled,
    cancellation_fee_percentage,
    cancellation_fee_amount,
    refund_policy,
    review_incentive_enabled,
    review_incentive_type,
    review_discount_percentage,
    review_discount_amount,
    review_min_rating,
    review_require_text,
    review_platforms,
    facebook_page_url,
    google_business_url,
  } = formState

  // Format currency symbol
  const getCurrencySymbol = (code?: string) => {
    const currencyMap: { [key: string]: string } = {
      GBP: '£',
      USD: '$',
      EUR: '€',
      CAD: 'C$',
      AUD: 'A$',
      JPY: '¥',
      CHF: 'CHF',
      CNY: '¥',
      INR: '₹',
      BRL: 'R$',
      MXN: '$',
      ZAR: 'R',
      NZD: 'NZ$',
      SGD: 'S$',
      HKD: 'HK$',
      NOK: 'kr',
      SEK: 'kr',
      DKK: 'kr',
      PLN: 'zł',
      CZK: 'Kč',
    }
    return currencyMap[code || 'GBP'] || code || '£'
  }

  const currencySymbol = getCurrencySymbol(currency)

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
        {currency && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Currency:</Text>
            <Text style={styles.summaryValue}>{currency}</Text>
          </View>
        )}
        {budgetMin && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Min Budget:</Text>
            <Text style={styles.summaryValue}>{`${currencySymbol}${budgetMin}`}</Text>
          </View>
        )}
        {budgetMax && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Max Budget:</Text>
            <Text style={styles.summaryValue}>{`${currencySymbol}${budgetMax}`}</Text>
          </View>
        )}
        {budgetType === 'price_list' && price_list && price_list.length > 0 && (
          <View style={styles.summaryItemColumn}>
            <Text style={styles.summaryLabel}>Service Options:</Text>
            <View style={styles.priceListContainer}>
              {price_list.map((item: any, index: number) => (
                <View key={index} style={styles.priceListItem}>
                  <Text style={styles.priceListName}>{item.serviceName || 'Service'}</Text>
                  <Text style={styles.priceListPrice}>{`${currencySymbol}${item.price || 0}`}</Text>
                </View>
              ))}
            </View>
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

      {/* Booking Settings Summary */}
      {booking_enabled && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Settings</Text>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Booking Enabled:</Text>
            <View style={styles.summaryValueRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.summaryValue}>Yes</Text>
            </View>
          </View>
          {service_name && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Service Name:</Text>
              <Text style={styles.summaryValue}>{service_name}</Text>
            </View>
          )}
        </View>
      )}

      {/* Cancellation Policy Summary */}
      {(cancellation_hours || cancellation_fee_enabled) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cancellation Policy</Text>
          {cancellation_hours && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Cancellation Notice:</Text>
              <Text style={styles.summaryValue}>{cancellation_hours} hours</Text>
            </View>
          )}
          {cancellation_fee_enabled && (
            <>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Cancellation Fee:</Text>
                <Text style={styles.summaryValue}>
                  {cancellation_fee_percentage && cancellation_fee_percentage > 0
                    ? `${cancellation_fee_percentage}%`
                    : cancellation_fee_amount
                    ? `${currencySymbol}${cancellation_fee_amount}`
                    : 'Not set'}
                </Text>
              </View>
              {refund_policy && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Refund Policy:</Text>
                  <Text style={styles.summaryValue}>
                    {refund_policy === 'full'
                      ? 'Full Refund'
                      : refund_policy === 'partial'
                      ? 'Partial Refund'
                      : 'No Refund'}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Review Incentives Summary */}
      {review_incentive_enabled && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Review Incentives</Text>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Enabled:</Text>
            <View style={styles.summaryValueRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.summaryValue}>Yes</Text>
            </View>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Incentive Type:</Text>
            <Text style={styles.summaryValue}>
              {review_incentive_type
                ? review_incentive_type.charAt(0).toUpperCase() + review_incentive_type.slice(1)
                : 'Discount'}
            </Text>
          </View>
          {review_incentive_type === 'discount' && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Discount:</Text>
              <Text style={styles.summaryValue}>
                {review_discount_percentage && review_discount_percentage > 0
                  ? `${review_discount_percentage}%`
                  : review_discount_amount
                  ? `${currencySymbol}${review_discount_amount}`
                  : 'Not set'}
              </Text>
            </View>
          )}
          {review_min_rating && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Minimum Rating:</Text>
              <Text style={styles.summaryValue}>{review_min_rating} ⭐</Text>
            </View>
          )}
          {review_require_text && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Require Text:</Text>
              <View style={styles.summaryValueRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.summaryValue}>Yes</Text>
              </View>
            </View>
          )}
          {review_platforms && review_platforms.length > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Review Platforms:</Text>
              <View style={styles.platformsContainer}>
                {review_platforms.includes('in_app') && (
                  <View style={styles.platformBadge}>
                    <Ionicons name="phone-portrait" size={14} color="#6b7280" />
                    <Text style={styles.platformBadgeText}>In-App</Text>
                  </View>
                )}
                {review_platforms.includes('facebook') && (
                  <View style={styles.platformBadge}>
                    <Ionicons name="logo-facebook" size={14} color="#1877f2" />
                    <Text style={styles.platformBadgeText}>Facebook</Text>
                  </View>
                )}
                {review_platforms.includes('google') && (
                  <View style={styles.platformBadge}>
                    <Ionicons name="logo-google" size={14} color="#4285f4" />
                    <Text style={styles.platformBadgeText}>Google</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          {facebook_page_url && review_platforms?.includes('facebook') && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Facebook Page:</Text>
              <Text style={[styles.summaryValue, styles.urlText]} numberOfLines={1}>
                {facebook_page_url}
              </Text>
            </View>
          )}
          {google_business_url && review_platforms?.includes('google') && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Google Business:</Text>
              <Text style={[styles.summaryValue, styles.urlText]} numberOfLines={1}>
                {google_business_url}
              </Text>
            </View>
          )}
        </View>
      )}

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
  summaryItemColumn: {
    flexDirection: 'column',
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
  summaryValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  priceListContainer: {
    marginTop: 8,
    gap: 8,
  },
  priceListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  priceListName: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
  },
  priceListPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  platformsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  platformBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  urlText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
})
