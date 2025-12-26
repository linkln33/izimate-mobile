import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ListingFormState } from '../useListingForm'
import { CURRENCIES } from '../pricing/types'

interface Step6ReviewProps {
  formState: ListingFormState
  quota: any
}

export function Step6Review({ formState, quota }: Step6ReviewProps) {
  const {
    title,
    description,
    category,
    tags,
    photos,
    listing_type,
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
    // Rental fields
    rental_duration_type,
    rental_rate_hourly,
    rental_rate_daily,
    rental_rate_weekly,
    rental_rate_monthly,
    security_deposit,
    cleaning_fee,
    // Experience fields
    experience_duration_hours,
    experience_max_participants,
    experience_min_age,
    experience_meeting_point,
    // Subscription fields
    subscription_billing_cycle,
    subscription_trial_days,
    subscription_auto_renew,
    subscription_features,
    // Freelance fields
    freelance_category,
    freelance_portfolio_url,
    freelance_delivery_days,
    freelance_revisions_included,
    freelance_skills,
    // Auction fields
    auction_start_price,
    auction_reserve_price,
    auction_bid_increment,
    auction_buy_now_price,
    auction_end_time,
    // Space Sharing fields
    space_type,
    space_capacity,
    space_hourly_rate,
    space_daily_rate,
    space_amenities,
    // Fundraising fields
    fundraising_goal,
    fundraising_end_date,
    fundraising_category,
    fundraising_beneficiary,
    // Delivery fields
    delivery_type,
    delivery_radius_km,
    delivery_fee_structure,
    delivery_estimated_time,
    // Taxi fields
    taxi_vehicle_type,
    taxi_max_passengers,
    taxi_license_number,
    // Link fields
    link_url,
    link_type,
  } = formState

  // Get currency symbol from CURRENCIES array
  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]
  const currencySymbol = selectedCurrency.symbol

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  // Render type-specific pricing summary
  const renderPricingSummary = () => {
    switch (listing_type) {
      case 'rental':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rental Pricing</Text>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Duration Type:</Text>
              <Text style={styles.summaryValue}>
                {rental_duration_type ? rental_duration_type.charAt(0).toUpperCase() + rental_duration_type.slice(1) : 'Not set'}
              </Text>
            </View>
            {rental_duration_type === 'hourly' && rental_rate_hourly && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Hourly Rate:</Text>
                <Text style={styles.summaryValue}>{`${currencySymbol}${rental_rate_hourly}`}</Text>
              </View>
            )}
            {rental_duration_type === 'daily' && rental_rate_daily && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Daily Rate:</Text>
                <Text style={styles.summaryValue}>{`${currencySymbol}${rental_rate_daily}`}</Text>
              </View>
            )}
            {rental_duration_type === 'weekly' && rental_rate_weekly && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Weekly Rate:</Text>
                <Text style={styles.summaryValue}>{`${currencySymbol}${rental_rate_weekly}`}</Text>
              </View>
            )}
            {rental_duration_type === 'monthly' && rental_rate_monthly && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Monthly Rate:</Text>
                <Text style={styles.summaryValue}>{`${currencySymbol}${rental_rate_monthly}`}</Text>
              </View>
            )}
            {security_deposit && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Security Deposit:</Text>
                <Text style={styles.summaryValue}>{`${currencySymbol}${security_deposit}`}</Text>
              </View>
            )}
            {cleaning_fee && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Cleaning Fee:</Text>
                <Text style={styles.summaryValue}>{`${currencySymbol}${cleaning_fee}`}</Text>
              </View>
            )}
          </View>
        )

      case 'experience':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience Details</Text>
            {experience_duration_hours && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Duration:</Text>
                <Text style={styles.summaryValue}>{`${experience_duration_hours} hours`}</Text>
              </View>
            )}
            {experience_max_participants && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Max Participants:</Text>
                <Text style={styles.summaryValue}>{experience_max_participants}</Text>
              </View>
            )}
            {experience_min_age && experience_min_age > 0 && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Minimum Age:</Text>
                <Text style={styles.summaryValue}>{experience_min_age} years</Text>
              </View>
            )}
            {experience_meeting_point && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Meeting Point:</Text>
                <Text style={styles.summaryValue}>{experience_meeting_point}</Text>
              </View>
            )}
            {budgetMin && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Price per Person:</Text>
                <Text style={styles.summaryValue}>{`${currencySymbol}${budgetMin}`}</Text>
              </View>
            )}
          </View>
        )

      case 'subscription':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription Details</Text>
            {subscription_billing_cycle && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Billing Cycle:</Text>
                <Text style={styles.summaryValue}>
                  {subscription_billing_cycle.charAt(0).toUpperCase() + subscription_billing_cycle.slice(1)}
                </Text>
              </View>
            )}
            {budgetMin && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Price per {subscription_billing_cycle || 'month'}:</Text>
                <Text style={styles.summaryValue}>{`${currencySymbol}${budgetMin}`}</Text>
              </View>
            )}
            {subscription_trial_days && subscription_trial_days > 0 && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Free Trial:</Text>
                <Text style={styles.summaryValue}>{`${subscription_trial_days} days`}</Text>
              </View>
            )}
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Auto-Renewal:</Text>
              <View style={styles.summaryValueRow}>
                <Ionicons 
                  name={subscription_auto_renew ? "checkmark-circle" : "close-circle"} 
                  size={16} 
                  color={subscription_auto_renew ? "#10b981" : "#ef4444"} 
                />
                <Text style={styles.summaryValue}>{subscription_auto_renew ? 'Yes' : 'No'}</Text>
              </View>
            </View>
            {subscription_features && subscription_features.length > 0 && (
              <View style={styles.summaryItemColumn}>
                <Text style={styles.summaryLabel}>Features:</Text>
                <View style={styles.tagsContainer}>
                  {subscription_features.map((feature, index) => (
                    <View key={index} style={styles.tagBadge}>
                      <Text style={styles.tagText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )

      case 'freelance':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Freelance Service Details</Text>
            {freelance_category && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Category:</Text>
                <Text style={styles.summaryValue}>
                  {freelance_category === 'ugc' ? 'UGC Creator' : freelance_category.charAt(0).toUpperCase() + freelance_category.slice(1).replace('_', ' ')}
                </Text>
              </View>
            )}
            {freelance_portfolio_url && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Portfolio URL:</Text>
                <Text style={[styles.summaryValue, styles.urlText]} numberOfLines={1}>
                  {freelance_portfolio_url}
                </Text>
              </View>
            )}
            {freelance_skills && freelance_skills.length > 0 && (
              <View style={styles.summaryItemColumn}>
                <Text style={styles.summaryLabel}>Skills:</Text>
                <View style={styles.tagsContainer}>
                  {freelance_skills.map((skill, index) => (
                    <View key={index} style={styles.tagBadge}>
                      <Text style={styles.tagText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {budgetType && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Pricing Model:</Text>
                <Text style={styles.summaryValue}>
                  {budgetType === 'per_project' ? 'Per Project' : budgetType === 'per_hour' ? 'Per Hour' : 'Fixed Price'}
                </Text>
              </View>
            )}
            {budgetMin && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>
                  {budgetType === 'per_hour' ? 'Hourly Rate' : budgetType === 'per_project' ? 'Price per Project' : 'Fixed Price'}:
                </Text>
                <Text style={styles.summaryValue}>{`${currencySymbol}${budgetMin}`}</Text>
              </View>
            )}
            {freelance_delivery_days && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Delivery Days:</Text>
                <Text style={styles.summaryValue}>{`${freelance_delivery_days} days`}</Text>
              </View>
            )}
            {freelance_revisions_included !== undefined && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Revisions Included:</Text>
                <Text style={styles.summaryValue}>{freelance_revisions_included}</Text>
              </View>
            )}
          </View>
        )

      case 'auction':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Auction Details</Text>
            {auction_start_price && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Starting Bid:</Text>
                <Text style={styles.summaryValue}>{`${currencySymbol}${auction_start_price}`}</Text>
              </View>
            )}
            {auction_reserve_price && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Reserve Price:</Text>
                <Text style={styles.summaryValue}>{`${currencySymbol}${auction_reserve_price}`}</Text>
              </View>
            )}
            {auction_bid_increment && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Bid Increment:</Text>
                <Text style={styles.summaryValue}>{`${currencySymbol}${auction_bid_increment}`}</Text>
              </View>
            )}
            {auction_buy_now_price && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Buy Now Price:</Text>
                <Text style={styles.summaryValue}>{`${currencySymbol}${auction_buy_now_price}`}</Text>
              </View>
            )}
            {auction_end_time && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>End Time:</Text>
                <Text style={styles.summaryValue}>{formatDate(auction_end_time)}</Text>
              </View>
            )}
          </View>
        )

      case 'space_sharing':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Space Sharing Details</Text>
            {space_type && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Space Type:</Text>
                <Text style={styles.summaryValue}>
                  {space_type.charAt(0).toUpperCase() + space_type.slice(1).replace('_', ' ')}
                </Text>
              </View>
            )}
            {space_capacity && space_capacity > 0 && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Capacity:</Text>
                <Text style={styles.summaryValue}>{space_capacity}</Text>
              </View>
            )}
            {space_hourly_rate && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Hourly Rate:</Text>
                <Text style={styles.summaryValue}>{`${currencySymbol}${space_hourly_rate}`}</Text>
              </View>
            )}
            {space_daily_rate && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Daily Rate:</Text>
                <Text style={styles.summaryValue}>{`${currencySymbol}${space_daily_rate}`}</Text>
              </View>
            )}
            {space_amenities && space_amenities.length > 0 && (
              <View style={styles.summaryItemColumn}>
                <Text style={styles.summaryLabel}>Amenities:</Text>
                <View style={styles.tagsContainer}>
                  {space_amenities.map((amenity, index) => (
                    <View key={index} style={styles.tagBadge}>
                      <Text style={styles.tagText}>{amenity}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )

      case 'fundraising':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fundraising Details</Text>
            {fundraising_goal && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Goal:</Text>
                <Text style={styles.summaryValue}>{`${currencySymbol}${fundraising_goal}`}</Text>
              </View>
            )}
            {fundraising_category && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Category:</Text>
                <Text style={styles.summaryValue}>
                  {fundraising_category.charAt(0).toUpperCase() + fundraising_category.slice(1)}
                </Text>
              </View>
            )}
            {fundraising_beneficiary && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Beneficiary:</Text>
                <Text style={styles.summaryValue}>{fundraising_beneficiary}</Text>
              </View>
            )}
            {fundraising_end_date && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>End Date:</Text>
                <Text style={styles.summaryValue}>{formatDate(fundraising_end_date)}</Text>
              </View>
            )}
          </View>
        )

      case 'transportation':
        // Determine if it's delivery or taxi based on which fields are set
        const isDelivery = delivery_type !== undefined
        const isTaxi = taxi_vehicle_type !== undefined

        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transportation Service Details</Text>
            {isDelivery && (
              <>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Service Type:</Text>
                  <Text style={styles.summaryValue}>Delivery</Text>
                </View>
                {delivery_type && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Delivery Type:</Text>
                    <Text style={styles.summaryValue}>
                      {delivery_type.charAt(0).toUpperCase() + delivery_type.slice(1)}
                    </Text>
                  </View>
                )}
                {delivery_radius_km && delivery_radius_km > 0 && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Service Radius:</Text>
                    <Text style={styles.summaryValue}>{`${delivery_radius_km} km`}</Text>
                  </View>
                )}
                {delivery_fee_structure && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Fee Structure:</Text>
                    <Text style={styles.summaryValue}>
                      {delivery_fee_structure === 'distance_based' ? 'Per KM' : delivery_fee_structure === 'weight_based' ? 'Per Weight' : 'Fixed'}
                    </Text>
                  </View>
                )}
                {delivery_fee_structure === 'fixed' && budgetMin && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Fixed Fee:</Text>
                    <Text style={styles.summaryValue}>{`${currencySymbol}${budgetMin}`}</Text>
                  </View>
                )}
                {delivery_estimated_time && delivery_estimated_time > 0 && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Estimated Time:</Text>
                    <Text style={styles.summaryValue}>{`${delivery_estimated_time} minutes`}</Text>
                  </View>
                )}
              </>
            )}
            {isTaxi && (
              <>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Service Type:</Text>
                  <Text style={styles.summaryValue}>Taxi/Rideshare</Text>
                </View>
                {taxi_vehicle_type && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Vehicle Type:</Text>
                    <Text style={styles.summaryValue}>
                      {taxi_vehicle_type.charAt(0).toUpperCase() + taxi_vehicle_type.slice(1)}
                    </Text>
                  </View>
                )}
                {taxi_max_passengers && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Max Passengers:</Text>
                    <Text style={styles.summaryValue}>{taxi_max_passengers}</Text>
                  </View>
                )}
                {taxi_license_number && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>License Number:</Text>
                    <Text style={styles.summaryValue}>{taxi_license_number}</Text>
                  </View>
                )}
                {budgetMin && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Base Fare:</Text>
                    <Text style={styles.summaryValue}>{`${currencySymbol}${budgetMin}`}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )

      case 'link':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Link Details</Text>
            {link_url && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>URL:</Text>
                <Text style={[styles.summaryValue, styles.urlText]} numberOfLines={1}>
                  {link_url}
                </Text>
              </View>
            )}
            {link_type && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Link Type:</Text>
                <Text style={styles.summaryValue}>
                  {link_type === 'short_link' ? 'Short Link' : link_type.charAt(0).toUpperCase() + link_type.slice(1)}
                </Text>
              </View>
            )}
          </View>
        )

      default:
        // Service and Goods - show standard pricing
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing & Timing</Text>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Pricing Type:</Text>
              <Text style={styles.summaryValue}>
                {budgetType === 'price_list' ? 'Price List' : budgetType ? budgetType.charAt(0).toUpperCase() + budgetType.slice(1) : 'Not set'}
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
                <Text style={styles.summaryLabel}>{budgetType === 'range' ? 'Min Price' : 'Price'}:</Text>
                <Text style={styles.summaryValue}>{`${currencySymbol}${budgetMin}`}</Text>
              </View>
            )}
            {budgetMax && budgetType === 'range' && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Max Price:</Text>
                <Text style={styles.summaryValue}>{`${currencySymbol}${budgetMax}`}</Text>
              </View>
            )}
            {budgetType === 'price_list' && price_list && price_list.length > 0 && (
              <View style={styles.summaryItemColumn}>
                <Text style={styles.summaryLabel}>Service Options:</Text>
                <View style={styles.priceListContainer}>
                  {price_list.map((item: any, index: number) => {
                    const serviceName = item?.serviceName || 'Service'
                    const price = item?.price || 0
                    return (
                      <View key={index} style={styles.priceListItem}>
                        <Text style={styles.priceListName}>{serviceName}</Text>
                        <Text style={styles.priceListPrice}>{`${currencySymbol}${price}`}</Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            )}
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Urgency:</Text>
              <Text style={styles.summaryValue}>
                {urgency === 'asap' ? 'ASAP' : urgency === 'this_week' ? 'This Week' : urgency || 'Flexible'}
              </Text>
            </View>
            {preferredDate && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Preferred Date:</Text>
                <Text style={styles.summaryValue}>{preferredDate}</Text>
              </View>
            )}
          </View>
        )
    }
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Review & Submit</Text>

      {/* Basic Information Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Listing Type:</Text>
          <Text style={styles.summaryValue}>
            {listing_type ? listing_type.charAt(0).toUpperCase() + listing_type.slice(1).replace('_', ' ') : 'Service'}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Title:</Text>
          <Text style={styles.summaryValue}>{title || 'Not set'}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Category:</Text>
          <Text style={styles.summaryValue}>{category || 'Not set'}</Text>
        </View>
        {tags.length > 0 && (
          <View style={styles.summaryItemColumn}>
            <Text style={styles.summaryLabel}>Tags:</Text>
            <View style={styles.tagsContainer}>
              {tags.map((tag, index) => (
                <View key={index} style={styles.tagBadge}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {photos.length > 0 && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Photos:</Text>
            <Text style={styles.summaryValue}>{`${photos.length} photo(s)`}</Text>
          </View>
        )}
      </View>

      {/* Type-Specific Pricing Summary */}
      {renderPricingSummary()}

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
              <Text style={styles.summaryValue}>{`${cancellation_hours} hours`}</Text>
            </View>
          )}
          {cancellation_fee_enabled && (
            <>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Cancellation Fee:</Text>
                <Text style={styles.summaryValue}>
                  {cancellation_fee_percentage && cancellation_fee_percentage > 0
                    ? `${cancellation_fee_percentage}%`
                    : cancellation_fee_amount && cancellation_fee_amount > 0
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
                  : review_discount_amount && review_discount_amount > 0
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
    </ScrollView>
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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tagBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3b82f6',
  },
})
