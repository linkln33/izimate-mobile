import { useState, useEffect } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Switch } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import type { ListingFormState, ListingFormActions } from '../useListingForm'

interface Step6SettingsProps {
  formState: ListingFormState
  formActions: ListingFormActions
  listingId?: string
}

export function Step6Settings({ formState, formActions, listingId }: Step6SettingsProps) {
  const {
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
    review_max_uses_per_customer,
    review_auto_generate_coupon,
    review_coupon_code_prefix,
    review_coupon_valid_days,
    review_incentive_message,
    review_platforms,
    facebook_page_id,
    facebook_page_url,
    google_place_id,
    google_business_url,
  } = formState

  const {
    setCancellationHours,
    setCancellationFeeEnabled,
    setCancellationFeePercentage,
    setCancellationFeeAmount,
    setRefundPolicy,
    setReviewIncentiveEnabled,
    setReviewIncentiveType,
    setReviewDiscountPercentage,
    setReviewDiscountAmount,
    setReviewMinRating,
    setReviewRequireText,
    setReviewMaxUsesPerCustomer,
    setReviewAutoGenerateCoupon,
    setReviewCouponCodePrefix,
    setReviewCouponValidDays,
    setReviewIncentiveMessage,
    setReviewPlatforms,
    setFacebookPageId,
    setFacebookPageUrl,
    setGooglePlaceId,
    setGoogleBusinessUrl,
  } = formActions

  const [loading, setLoading] = useState(false)

  // Load existing review incentive settings when editing
  useEffect(() => {
    if (listingId) {
      loadReviewIncentiveSettings()
    }
  }, [listingId])

  const loadReviewIncentiveSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('review_incentive_settings')
        .select('*')
        .eq('provider_id', user.id)
        .eq('listing_id', listingId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading review incentive settings:', error)
        return
      }

      if (data) {
        setReviewIncentiveEnabled?.(data.enabled)
        setReviewIncentiveType?.(data.incentive_type || 'discount')
        setReviewDiscountPercentage?.(data.discount_percentage || 0)
        setReviewDiscountAmount?.(data.discount_amount || 0)
        setReviewMinRating?.(data.min_rating || 4.0)
        setReviewRequireText?.(data.require_text_review || false)
        setReviewMaxUsesPerCustomer?.(data.max_uses_per_customer || 1)
        setReviewAutoGenerateCoupon?.(data.auto_generate_coupon ?? true)
        setReviewCouponCodePrefix?.(data.coupon_code_prefix || 'REVIEW')
        setReviewCouponValidDays?.(data.coupon_valid_days || 30)
        setReviewIncentiveMessage?.(data.incentive_message || 'Thank you for your review! Here\'s a discount for your next booking.')
        setReviewPlatforms?.(data.review_platforms || ['in_app'])
        setFacebookPageId?.(data.facebook_page_id || '')
        setFacebookPageUrl?.(data.facebook_page_url || '')
        setGooglePlaceId?.(data.google_place_id || '')
        setGoogleBusinessUrl?.(data.google_business_url || '')
      }
    } catch (error) {
      console.error('Failed to load review incentive settings:', error)
    }
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Settings</Text>
      <Text style={styles.stepSubtitle}>
        Configure cancellation policy and review incentives
      </Text>

      {/* Cancellation Policy Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="close-circle-outline" size={24} color="#f25842" />
          <Text style={styles.sectionTitle}>Cancellation Policy</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cancellation Notice (Hours)</Text>
          <TextInput
            style={styles.input}
            value={cancellation_hours?.toString() || '24'}
            onChangeText={(text) => {
              const hours = parseInt(text) || 24
              setCancellationHours?.(hours)
            }}
            placeholder="24"
            keyboardType="numeric"
            placeholderTextColor="#9ca3af"
          />
          <Text style={styles.inputHelp}>
            Minimum hours before booking that customers can cancel without penalty
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Enable Cancellation Fee</Text>
            <Switch
              value={cancellation_fee_enabled || false}
              onValueChange={setCancellationFeeEnabled}
              trackColor={{ false: '#e5e7eb', true: '#fee2e2' }}
              thumbColor={cancellation_fee_enabled ? '#f25842' : '#f3f4f6'}
            />
          </View>
        </View>

        {cancellation_fee_enabled && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fee Type</Text>
              <View style={styles.feeTypeButtons}>
                <Pressable
                  style={[
                    styles.feeTypeButton,
                    (!cancellation_fee_percentage || cancellation_fee_percentage === 0) && styles.feeTypeButtonActive,
                  ]}
                  onPress={() => {
                    setCancellationFeePercentage?.(0)
                    setCancellationFeeAmount?.(0)
                  }}
                >
                  <Text
                    style={[
                      styles.feeTypeButtonText,
                      (!cancellation_fee_percentage || cancellation_fee_percentage === 0) && styles.feeTypeButtonTextActive,
                    ]}
                  >
                    Fixed Amount
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.feeTypeButton,
                    cancellation_fee_percentage && cancellation_fee_percentage > 0 && styles.feeTypeButtonActive,
                  ]}
                  onPress={() => {
                    setCancellationFeePercentage?.(10)
                    setCancellationFeeAmount?.(0)
                  }}
                >
                  <Text
                    style={[
                      styles.feeTypeButtonText,
                      cancellation_fee_percentage && cancellation_fee_percentage > 0 && styles.feeTypeButtonTextActive,
                    ]}
                  >
                    Percentage
                  </Text>
                </Pressable>
              </View>
            </View>

            {cancellation_fee_percentage && cancellation_fee_percentage > 0 ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Fee Percentage (%)</Text>
                <TextInput
                  style={styles.input}
                  value={cancellation_fee_percentage?.toString() || '0'}
                  onChangeText={(text) => {
                    const percentage = parseFloat(text) || 0
                    setCancellationFeePercentage?.(percentage)
                  }}
                  placeholder="10"
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Fee Amount</Text>
                <TextInput
                  style={styles.input}
                  value={cancellation_fee_amount?.toString() || '0'}
                  onChangeText={(text) => {
                    const amount = parseFloat(text) || 0
                    setCancellationFeeAmount?.(amount)
                  }}
                  placeholder="5.00"
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            )}
          </>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Refund Policy</Text>
          <View style={styles.refundPolicyButtons}>
            {(['full', 'partial', 'none'] as const).map((policy) => (
              <Pressable
                key={policy}
                style={[
                  styles.refundPolicyButton,
                  refund_policy === policy && styles.refundPolicyButtonActive,
                ]}
                onPress={() => setRefundPolicy?.(policy)}
              >
                <Text
                  style={[
                    styles.refundPolicyButtonText,
                    refund_policy === policy && styles.refundPolicyButtonTextActive,
                  ]}
                >
                  {policy === 'full' ? 'Full Refund' : policy === 'partial' ? 'Partial Refund' : 'No Refund'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Review Incentive Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="star-outline" size={24} color="#fbbf24" />
          <Text style={styles.sectionTitle}>Review Incentives</Text>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Enable Review Incentives</Text>
            <Switch
              value={review_incentive_enabled || false}
              onValueChange={setReviewIncentiveEnabled}
              trackColor={{ false: '#e5e7eb', true: '#fee2e2' }}
              thumbColor={review_incentive_enabled ? '#f25842' : '#f3f4f6'}
            />
          </View>
          <Text style={styles.inputHelp}>
            Offer discounts or rewards to customers who leave reviews
          </Text>
        </View>

        {review_incentive_enabled && (
          <>
            {/* Review Platform Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Review Platforms</Text>
              <Text style={styles.inputHelp}>
                Select where customers can leave reviews to receive incentives
              </Text>
              
              {/* In-App Reviews */}
              <View style={styles.platformOption}>
                <View style={styles.platformHeader}>
                  <Ionicons name="phone-portrait-outline" size={20} color="#6b7280" />
                  <Text style={styles.platformLabel}>In-App Reviews</Text>
                  <Switch
                    value={review_platforms?.includes('in_app') ?? true}
                    onValueChange={(enabled) => {
                      const platforms = review_platforms || []
                      if (enabled) {
                        setReviewPlatforms?.([...platforms.filter(p => p !== 'in_app'), 'in_app'])
                      } else {
                        setReviewPlatforms?.(platforms.filter(p => p !== 'in_app'))
                      }
                    }}
                    trackColor={{ false: '#e5e7eb', true: '#fee2e2' }}
                    thumbColor={review_platforms?.includes('in_app') ? '#f25842' : '#f3f4f6'}
                  />
                </View>
                <Text style={styles.platformDescription}>
                  Customers leave reviews directly in the app
                </Text>
              </View>

              {/* Facebook Reviews */}
              <View style={styles.platformOption}>
                <View style={styles.platformHeader}>
                  <Ionicons name="logo-facebook" size={20} color="#1877f2" />
                  <Text style={styles.platformLabel}>Facebook Page Reviews</Text>
                  <Switch
                    value={review_platforms?.includes('facebook') ?? false}
                    onValueChange={(enabled) => {
                      const platforms = review_platforms || []
                      if (enabled) {
                        setReviewPlatforms?.([...platforms.filter(p => p !== 'facebook'), 'facebook'])
                      } else {
                        setReviewPlatforms?.(platforms.filter(p => p !== 'facebook'))
                        setFacebookPageId?.('')
                        setFacebookPageUrl?.('')
                      }
                    }}
                    trackColor={{ false: '#e5e7eb', true: '#fee2e2' }}
                    thumbColor={review_platforms?.includes('facebook') ? '#f25842' : '#f3f4f6'}
                  />
                </View>
                {review_platforms?.includes('facebook') && (
                  <>
                    <TextInput
                      style={styles.input}
                      value={facebook_page_url || ''}
                      onChangeText={setFacebookPageUrl}
                      placeholder="https://www.facebook.com/your-page"
                      placeholderTextColor="#9ca3af"
                    />
                    <Text style={styles.inputHelp}>
                      Enter your Facebook Page URL. Customers will be directed here to leave reviews.
                    </Text>
                  </>
                )}
              </View>

              {/* Google Reviews */}
              <View style={styles.platformOption}>
                <View style={styles.platformHeader}>
                  <Ionicons name="logo-google" size={20} color="#4285f4" />
                  <Text style={styles.platformLabel}>Google Business Reviews</Text>
                  <Switch
                    value={review_platforms?.includes('google') ?? false}
                    onValueChange={(enabled) => {
                      const platforms = review_platforms || []
                      if (enabled) {
                        setReviewPlatforms?.([...platforms.filter(p => p !== 'google'), 'google'])
                      } else {
                        setReviewPlatforms?.(platforms.filter(p => p !== 'google'))
                        setGooglePlaceId?.('')
                        setGoogleBusinessUrl?.('')
                      }
                    }}
                    trackColor={{ false: '#e5e7eb', true: '#fee2e2' }}
                    thumbColor={review_platforms?.includes('google') ? '#f25842' : '#f3f4f6'}
                  />
                </View>
                {review_platforms?.includes('google') && (
                  <>
                    <TextInput
                      style={styles.input}
                      value={google_business_url || ''}
                      onChangeText={setGoogleBusinessUrl}
                      placeholder="https://g.page/r/your-business"
                      placeholderTextColor="#9ca3af"
                    />
                    <Text style={styles.inputHelp}>
                      Enter your Google Business Profile review link. You can find this in your Google Business dashboard.
                    </Text>
                  </>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Incentive Type</Text>
              <View style={styles.incentiveTypeButtons}>
                {(['discount', 'credit', 'points'] as const).map((type) => (
                  <Pressable
                    key={type}
                    style={[
                      styles.incentiveTypeButton,
                      review_incentive_type === type && styles.incentiveTypeButtonActive,
                    ]}
                    onPress={() => setReviewIncentiveType?.(type)}
                  >
                    <Text
                      style={[
                        styles.incentiveTypeButtonText,
                        review_incentive_type === type && styles.incentiveTypeButtonTextActive,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {review_incentive_type === 'discount' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Discount Type</Text>
                  <View style={styles.discountTypeButtons}>
                    <Pressable
                      style={[
                        styles.discountTypeButton,
                        (!review_discount_percentage || review_discount_percentage === 0) && styles.discountTypeButtonActive,
                      ]}
                      onPress={() => {
                        setReviewDiscountPercentage?.(0)
                        setReviewDiscountAmount?.(0)
                      }}
                    >
                      <Text
                        style={[
                          styles.discountTypeButtonText,
                          (!review_discount_percentage || review_discount_percentage === 0) && styles.discountTypeButtonTextActive,
                        ]}
                      >
                        Fixed Amount
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.discountTypeButton,
                        review_discount_percentage && review_discount_percentage > 0 && styles.discountTypeButtonActive,
                      ]}
                      onPress={() => {
                        setReviewDiscountPercentage?.(10)
                        setReviewDiscountAmount?.(0)
                      }}
                    >
                      <Text
                        style={[
                          styles.discountTypeButtonText,
                          review_discount_percentage && review_discount_percentage > 0 && styles.discountTypeButtonTextActive,
                        ]}
                      >
                        Percentage
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {review_discount_percentage && review_discount_percentage > 0 ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Discount Percentage (%)</Text>
                    <TextInput
                      style={styles.input}
                      value={review_discount_percentage?.toString() || '0'}
                      onChangeText={(text) => {
                        const percentage = parseFloat(text) || 0
                        setReviewDiscountPercentage?.(percentage)
                      }}
                      placeholder="10"
                      keyboardType="numeric"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                ) : (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Discount Amount</Text>
                    <TextInput
                      style={styles.input}
                      value={review_discount_amount?.toString() || '0'}
                      onChangeText={(text) => {
                        const amount = parseFloat(text) || 0
                        setReviewDiscountAmount?.(amount)
                      }}
                      placeholder="5.00"
                      keyboardType="numeric"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                )}
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Minimum Rating</Text>
              <TextInput
                style={styles.input}
                value={review_min_rating?.toString() || '4.0'}
                onChangeText={(text) => {
                  const rating = parseFloat(text) || 4.0
                  setReviewMinRating?.(rating)
                }}
                placeholder="4.0"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.inputHelp}>
                Minimum rating required to receive the incentive (1.0 - 5.0)
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Require Written Review</Text>
                <Switch
                  value={review_require_text || false}
                  onValueChange={setReviewRequireText}
                  trackColor={{ false: '#e5e7eb', true: '#fee2e2' }}
                  thumbColor={review_require_text ? '#f25842' : '#f3f4f6'}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Max Uses Per Customer</Text>
              <TextInput
                style={styles.input}
                value={review_max_uses_per_customer?.toString() || '1'}
                onChangeText={(text) => {
                  const uses = parseInt(text) || 1
                  setReviewMaxUsesPerCustomer?.(uses)
                }}
                placeholder="1"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.inputHelp}>
                How many times the same customer can claim this incentive
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Auto-Generate Coupon Codes</Text>
                <Switch
                  value={review_auto_generate_coupon ?? true}
                  onValueChange={setReviewAutoGenerateCoupon}
                  trackColor={{ false: '#e5e7eb', true: '#fee2e2' }}
                  thumbColor={review_auto_generate_coupon ? '#f25842' : '#f3f4f6'}
                />
              </View>
            </View>

            {review_auto_generate_coupon && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Coupon Code Prefix</Text>
                  <TextInput
                    style={styles.input}
                    value={review_coupon_code_prefix || 'REVIEW'}
                    onChangeText={setReviewCouponCodePrefix}
                    placeholder="REVIEW"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Coupon Valid Days</Text>
                  <TextInput
                    style={styles.input}
                    value={review_coupon_valid_days?.toString() || '30'}
                    onChangeText={(text) => {
                      const days = parseInt(text) || 30
                      setReviewCouponValidDays?.(days)
                    }}
                    placeholder="30"
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Incentive Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={review_incentive_message || ''}
                onChangeText={setReviewIncentiveMessage}
                placeholder="Thank you for your review! Here's a discount for your next booking."
                multiline
                numberOfLines={3}
                placeholderTextColor="#9ca3af"
              />
            </View>
          </>
        )}
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
  section: {
    marginBottom: 32,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputHelp: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  feeTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  feeTypeButtonActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#f25842',
  },
  feeTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  feeTypeButtonTextActive: {
    color: '#f25842',
    fontWeight: '600',
  },
  refundPolicyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  refundPolicyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  refundPolicyButtonActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#f25842',
  },
  refundPolicyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  refundPolicyButtonTextActive: {
    color: '#f25842',
    fontWeight: '600',
  },
  incentiveTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  incentiveTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  incentiveTypeButtonActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#f25842',
  },
  incentiveTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  incentiveTypeButtonTextActive: {
    color: '#f25842',
    fontWeight: '600',
  },
  discountTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  discountTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  discountTypeButtonActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#f25842',
  },
  discountTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  discountTypeButtonTextActive: {
    color: '#f25842',
    fontWeight: '600',
  },
  platformOption: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  platformLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  platformDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
})

