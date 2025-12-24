import { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Dimensions, Image, Pressable, Linking, Platform, ActivityIndicator, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Listing, User } from '@/lib/types'
import { getMainPhoto } from '@/lib/utils/images'
import { formatBudget, getCurrencyFromUser } from '@/lib/utils/price'
import { formatDate, formatRelativeTime } from '@/lib/utils/date'
import { getUserCurrency } from '@/lib/utils/currency'
import { useRouter } from 'expo-router'

const getDimensions = () => Dimensions.get('window')

interface EnrichedListing extends Listing {
  customer?: User
  customerRating?: number
  positivePercentage?: number
  distance?: number
}

interface ListingCardProps {
  listing: EnrichedListing
  isExpanded?: boolean
  onExpandChange?: (expanded: boolean) => void
  // Action buttons (for offer page - user's own listings)
  showActions?: boolean
  onEdit?: (listingId: string) => void
  onDelete?: (listingId: string) => void
  isDeleting?: boolean
  // Like/dislike/chat buttons (for find page - all listings)
  showLikeButtons?: boolean
  onLike?: (listingId: string) => void
  onDislike?: (listingId: string) => void
  onChat?: (listingId: string) => void
  isOwnListing?: boolean // If true, don't show like buttons (user can't like their own)
  // Booking functionality
  showBookingButton?: boolean
  onBookingComplete?: (bookingId: string) => void
  // Currency for formatting prices (optional - will detect from user if not provided)
  userCurrency?: string | null
  userCountry?: string | null
}

// Star Rating Component
function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <Ionicons key={`full-${i}`} name="star" size={size} color="#fbbf24" />
      ))}
      {hasHalfStar && (
        <Ionicons key="half" name="star-half" size={size} color="#fbbf24" />
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Ionicons key={`empty-${i}`} name="star-outline" size={size} color="#d1d5db" />
      ))}
    </View>
  )
}

export function ListingCard({ 
  listing, 
  isExpanded: externalExpanded,
  onExpandChange,
  showActions = false,
  onEdit,
  onDelete,
  isDeleting = false,
  showLikeButtons = false,
  onLike,
  onDislike,
  onChat,
  isOwnListing = false,
  showBookingButton = false,
  onBookingComplete,
  userCurrency,
  userCountry,
}: ListingCardProps) {
  const router = useRouter()
  const [imageError, setImageError] = useState(false)
  const [internalExpanded, setInternalExpanded] = useState(false)
  const [dimensions, setDimensions] = useState(getDimensions())
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const scrollViewRef = useRef<ScrollView>(null)
  
  // Listen for dimension changes (especially on web when window is resized)
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window)
    })
    
    // On web, also listen to window resize
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleResize = () => {
        setDimensions(getDimensions())
      }
      window.addEventListener('resize', handleResize)
      return () => {
        subscription?.remove()
        window.removeEventListener('resize', handleResize)
      }
    }
    
    return () => {
      subscription?.remove()
    }
  }, [])
  
  // Use external expanded state if provided, otherwise use internal
  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded

  const handleToggleExpand = () => {
    const newExpanded = !isExpanded
    if (externalExpanded === undefined) {
      setInternalExpanded(newExpanded)
    }
    onExpandChange?.(newExpanded)
  }
  
  // Ensure we have a rating (use random if missing)
  const displayRating = listing.customerRating ?? (Math.random() * 1.5 + 3.5)

  // Get all valid photo URLs
  const validPhotos = listing.photos?.filter(photo => 
    photo && typeof photo === 'string' && photo.trim().length > 0
  ) || []
  
  // Get first valid photo URL using shared utility for fallback
  const mainPhoto = getMainPhoto(listing.photos)
  
  // Debug logging for image URLs
  useEffect(() => {
    if (validPhotos.length > 0) {
      console.log('🖼️ ListingCard - Valid photos count:', validPhotos.length)
      console.log('🖼️ ListingCard - Valid photos:', validPhotos)
      console.log('🖼️ ListingCard - Card width:', cardMaxWidth)
      console.log('🖼️ ListingCard - All photos:', listing.photos)
    } else if (listing.photos && listing.photos.length > 0) {
      console.warn('⚠️ ListingCard - Photos array exists but no valid photos found:', listing.photos)
    }
  }, [validPhotos.length, listing.photos])

  // Get currency: listing currency > user currency > country-based detection > default GBP
  const currencyCode = listing.currency || 
    (userCurrency ? getUserCurrency(userCurrency, userCountry) : 'GBP')
  
  // Debug: Log listing data
  useEffect(() => {
    console.log('📋 ListingCard - Listing data:', {
      id: listing.id,
      budget_type: listing.budget_type,
      price_list: listing.price_list,
      booking_enabled: listing.booking_enabled,
      service_name: listing.service_name,
      time_slots: listing.time_slots,
    });
  }, [listing.id, listing.budget_type, listing.price_list, listing.booking_enabled]);
  
  // Format budget using shared utility
  const budgetText = formatBudget(
    listing.budget_min,
    listing.budget_max,
    listing.budget_type,
    currencyCode
  )

  const urgencyText = listing.urgency === 'asap' 
    ? 'ASAP' 
    : listing.urgency === 'this_week' 
    ? 'This Week' 
    : 'Flexible'

  // Calculate responsive image height
  const imageHeight = Platform.OS === 'web' 
    ? Math.min(dimensions.height * 0.4, dimensions.width * 0.6, 400)
    : dimensions.height * 0.4
  const minImageHeight = Platform.OS === 'web' ? 200 : dimensions.height * 0.3
  const maxImageHeight = Platform.OS === 'web' ? 400 : dimensions.height * 0.5
  const finalImageHeight = Math.max(minImageHeight, Math.min(maxImageHeight, imageHeight))

  // Calculate responsive card width
  const cardMaxWidth = Platform.OS === 'web' 
    ? Math.min(600, dimensions.width - 32) 
    : dimensions.width - 32

  // Navigation functions for image arrows
  const goToPreviousImage = () => {
    console.log('🔙 Previous image clicked, current index:', currentImageIndex)
    if (currentImageIndex > 0 && scrollViewRef.current) {
      const newIndex = currentImageIndex - 1
      const scrollX = newIndex * cardMaxWidth
      console.log('🔙 Scrolling to index:', newIndex, 'scrollX:', scrollX, 'cardWidth:', cardMaxWidth)
      setCurrentImageIndex(newIndex)
      scrollViewRef.current.scrollTo({ x: scrollX, animated: true })
    }
  }

  const goToNextImage = () => {
    console.log('▶️ Next image clicked, current index:', currentImageIndex)
    if (currentImageIndex < validPhotos.length - 1 && scrollViewRef.current) {
      const newIndex = currentImageIndex + 1
      const scrollX = newIndex * cardMaxWidth
      console.log('▶️ Scrolling to index:', newIndex, 'scrollX:', scrollX, 'cardWidth:', cardMaxWidth)
      setCurrentImageIndex(newIndex)
      scrollViewRef.current.scrollTo({ x: scrollX, animated: true })
    }
  }

  return (
    <View style={[styles.listingCard, { maxWidth: cardMaxWidth, width: '100%' }]}>
        {/* Image Section - Fixed at top */}
        <View style={[styles.imageContainer, { height: finalImageHeight }]}>
          {validPhotos.length > 0 && !imageError ? (
            <>
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const newIndex = Math.round(
                    event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width
                  )
                  setCurrentImageIndex(newIndex)
                }}
                style={styles.imageScrollView}
              >
                {validPhotos.map((photo, index) => (
                  <Image
                    key={index}
                    source={{ uri: photo }}
                    style={[styles.listingImage, { width: cardMaxWidth }]}
                    resizeMode="cover"
                    onError={(error) => {
                      console.error(`❌ Image load error for photo ${index}:`, photo)
                      console.error('Error details:', error)
                      if (index === 0) {
                        setImageError(true)
                      }
                    }}
                    onLoad={() => {
                      console.log(`✅ Image ${index} loaded successfully:`, photo)
                    }}
                  />
                ))}
              </ScrollView>
              
              {/* Navigation Arrows - Only show when multiple images */}
              {validPhotos.length > 1 && (
                <>
                  {/* Left Arrow */}
                  {currentImageIndex > 0 && (
                    <Pressable
                      style={[styles.imageArrow, styles.imageArrowLeft]}
                      onPress={goToPreviousImage}
                    >
                      <Ionicons name="chevron-back" size={24} color="#ffffff" />
                    </Pressable>
                  )}
                  
                  {/* Right Arrow */}
                  {currentImageIndex < validPhotos.length - 1 && (
                    <Pressable
                      style={[styles.imageArrow, styles.imageArrowRight]}
                      onPress={goToNextImage}
                    >
                      <Ionicons name="chevron-forward" size={24} color="#ffffff" />
                    </Pressable>
                  )}
                </>
              )}
              
              {/* Image indicators */}
              {validPhotos.length > 1 && (
                <View style={styles.imageIndicators}>
                  {validPhotos.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.imageIndicator,
                        index === currentImageIndex && styles.imageIndicatorActive
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={64} color="#9ca3af" />
              <Text style={styles.placeholderText}>
                {listing.photos && listing.photos.length > 0 ? 'Image Failed to Load' : 'No Image Available'}
              </Text>
            </View>
          )}
          
          {/* Category Badge on Image - Top Left */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{listing.category || 'General'}</Text>
          </View>
          
          {/* Urgency Badge on Image - Top Right */}
          {listing.urgency && listing.urgency !== 'flexible' && (
            <View style={[
              styles.urgencyBadge,
              listing.urgency === 'asap' && styles.urgencyBadgeASAP
            ]}>
              <Ionicons 
                name={listing.urgency === 'asap' ? 'flash' : 'time'} 
                size={12} 
                color="#ffffff" 
              />
              <Text style={styles.urgencyBadgeText}>{urgencyText}</Text>
            </View>
          )}
          
          {listing.distance && (
            <View style={[styles.distanceBadge, { bottom: 16, top: 'auto' }]}>
              <Ionicons name="location" size={14} color="#ffffff" />
              <Text style={styles.distanceText}>{listing.distance.toFixed(1)} km</Text>
            </View>
          )}
        </View>
        
        {/* Content Section - Scrolls below image */}
        <View style={styles.listingContent}>
          {/* Customer Profile Section */}
          {listing.customer && (
            <View style={styles.customerSection}>
              <View style={styles.customerInfo}>
                {listing.customer.avatar_url ? (
                  <Image 
                    source={{ uri: listing.customer.avatar_url }} 
                    style={styles.customerAvatar}
                  />
                ) : (
                  <View style={styles.customerAvatarPlaceholder}>
                    <Ionicons name="person" size={20} color="#6b7280" />
                  </View>
                )}
                <View style={styles.customerDetails}>
                  <View style={styles.customerNameRow}>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {listing.customer.name || 'Service Provider'}
                    </Text>
                    {listing.customer.verification_status === 'verified' && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="shield-checkmark" size={12} color="#a855f7" />
                        <Text style={styles.verifiedBadgeText}>Verified</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.ratingRow}>
                    <StarRating rating={displayRating} size={14} />
                    <Text style={styles.ratingText}>{displayRating.toFixed(1)}</Text>
                    {listing.positivePercentage !== undefined && (
                      <Text style={styles.positivePercentage}>
                        ({listing.positivePercentage}% positive)
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Title */}
          <Text style={styles.listingTitle} numberOfLines={isExpanded ? undefined : 2}>
            {listing.title || 'Untitled Listing'}
          </Text>
          
          {/* Budget and Urgency - Compact Row */}
          <View style={styles.listingMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={16} color="#6b7280" />
              <Text style={styles.metaText}>{budgetText}</Text>
            </View>
            {listing.urgency && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color="#6b7280" />
                <Text style={styles.metaText}>{urgencyText}</Text>
              </View>
            )}
          </View>

          {/* Location */}
          {listing.location_address && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#6b7280" />
              <Text style={styles.locationText} numberOfLines={1}>
                {listing.location_address}
              </Text>
              {(listing.location_lat && listing.location_lng) && (
                <Pressable
                  onPress={async () => {
                    const wazeUrl = `https://waze.com/ul?ll=${listing.location_lat},${listing.location_lng}&navigate=yes&utm_source=izimate-job`
                    try {
                      const canOpen = await Linking.canOpenURL(wazeUrl)
                      if (canOpen) {
                        await Linking.openURL(wazeUrl)
                      } else {
                        // Fallback: try to open in browser
                        await Linking.openURL(wazeUrl)
                      }
                    } catch (error) {
                      console.error('Failed to open Waze:', error)
                    }
                  }}
                  style={styles.directionsButton}
                >
                  <Text style={styles.directionsButtonText}>Directions</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Description */}
          <Text 
            style={styles.listingDescription} 
            numberOfLines={isExpanded ? undefined : 3}
          >
            {listing.description || 'No description available'}
          </Text>

          {/* Tags */}
          {listing.tags && listing.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {listing.tags.slice(0, isExpanded ? 10 : 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              {listing.tags.length > 3 && !isExpanded && (
                <Text style={styles.moreTagsText}>+{listing.tags.length - 3} more</Text>
              )}
            </View>
          )}

          {/* Expanded Details */}
          {isExpanded && (
            <View style={styles.expandedDetails}>
              {/* Full Description Section */}
              <View style={styles.expandedSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="document-text-outline" size={18} color="#f25842" />
                  <Text style={styles.sectionTitle}>Full Description</Text>
                </View>
                <Text style={styles.fullDescription}>
                  {listing.description || 'No detailed description provided.'}
                </Text>
              </View>

              {/* Schedule & Timing Section */}
              <View style={styles.expandedSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="calendar-outline" size={18} color="#f25842" />
                  <Text style={styles.sectionTitle}>Schedule & Timing</Text>
                </View>
                
                <View style={styles.scheduleGrid}>
                  {/* Preferred Date */}
                  {listing.preferred_date && (
                    <View style={styles.scheduleItem}>
                      <Text style={styles.scheduleLabel}>Preferred Date</Text>
                      <Text style={styles.scheduleValue}>
                        {listing.preferred_date ? formatDate(listing.preferred_date) : 'Not specified'}
                      </Text>
                    </View>
                  )}
                  
                  {/* Urgency */}
                  <View style={styles.scheduleItem}>
                    <Text style={styles.scheduleLabel}>Timeline</Text>
                    <View style={styles.urgencyContainer}>
                      <Ionicons 
                        name={listing.urgency === 'asap' ? 'flash' : listing.urgency === 'this_week' ? 'time' : 'calendar'} 
                        size={14} 
                        color={listing.urgency === 'asap' ? '#ef4444' : '#f25842'} 
                      />
                      <Text style={[styles.scheduleValue, listing.urgency === 'asap' && styles.urgentText]}>
                        {urgencyText}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Posted Date */}
                  <View style={styles.scheduleItem}>
                    <Text style={styles.scheduleLabel}>Posted</Text>
                    <Text style={styles.scheduleValue}>
                      {listing.created_at ? formatRelativeTime(listing.created_at) : 'Recently'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Service Costs Section - Replaces Budget Details */}
              <View style={styles.expandedSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="wallet-outline" size={18} color="#f25842" />
                  <Text style={styles.sectionTitle}>Service Costs</Text>
                </View>
                
                {listing.budget_type === 'price_list' && listing.price_list && listing.price_list.length > 0 ? (
                  <View style={styles.priceListSection}>
                    {listing.price_list.map((item: any, index: number) => (
                      <View key={index} style={styles.priceListItem}>
                        <Text style={styles.priceListServiceName}>{item.serviceName}</Text>
                        <Text style={styles.priceListPrice}>£{item.price}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.budgetBreakdown}>
                    <View style={styles.budgetItem}>
                      <Text style={styles.budgetLabel}>
                        {listing.budget_type === 'fixed' ? 'Fixed Price' : 
                         listing.budget_type === 'range' ? 'Price Range' : 'Price'}
                      </Text>
                      <Text style={styles.budgetValue}>{budgetText}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Booking Availability Section - Replaces Activity when booking is enabled */}
              {listing.booking_enabled && listing.time_slots && listing.time_slots.length > 0 ? (
                <View style={styles.expandedSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="calendar-outline" size={18} color="#f25842" />
                    <Text style={styles.sectionTitle}>Available Time Slots</Text>
                  </View>
                  
                  <View style={styles.timeSlotsContainer}>
                    {listing.service_name && (
                      <Text style={styles.bookingServiceName}>
                        Service: {listing.service_name}
                      </Text>
                    )}
                    <Text style={styles.timeSlotsTitle}>Weekly Schedule:</Text>
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                      const daySlots = listing.time_slots?.filter((slot: any) => slot.day === day);
                      if (!daySlots || daySlots.length === 0) return null;
                      
                      return (
                        <View key={day} style={styles.daySlotRow}>
                          <Text style={styles.dayName}>
                            {day.charAt(0).toUpperCase() + day.slice(1)}:
                          </Text>
                          <View style={styles.slotsForDay}>
                            {daySlots.map((slot: any, idx: number) => (
                              <Text key={idx} style={styles.slotTime}>
                                {slot.startTime} - {slot.endTime}
                              </Text>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                    <View style={styles.bookingAvailability}>
                      <Ionicons name="checkmark-circle" size={16} color="#15803d" />
                      <Text style={styles.bookingAvailabilityText}>
                        Online booking available
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                /* Activity & Stats Section - Only show when booking is NOT enabled */
                <View style={styles.expandedSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="analytics-outline" size={18} color="#f25842" />
                    <Text style={styles.sectionTitle}>Activity</Text>
                  </View>
                  
                  <View style={styles.statsGrid}>
                    {(listing.view_count || 0) > 0 && (
                      <View style={styles.statCard}>
                        <Ionicons name="eye-outline" size={16} color="#6b7280" />
                        <Text style={styles.statNumber}>{listing.view_count || 0}</Text>
                        <Text style={styles.statLabel}>Views</Text>
                      </View>
                    )}
                    
                    {(listing.swipe_count || 0) > 0 && (
                      <View style={styles.statCard}>
                        <Ionicons name="heart-outline" size={16} color="#10b981" />
                        <Text style={styles.statNumber}>{listing.swipe_count || 0}</Text>
                        <Text style={styles.statLabel}>Likes</Text>
                      </View>
                    )}
                    
                    {(listing.match_count || 0) > 0 && (
                      <View style={styles.statCard}>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#f25842" />
                        <Text style={styles.statNumber}>{listing.match_count || 0}</Text>
                        <Text style={styles.statLabel}>Matches</Text>
                      </View>
                    )}
                    
                    {/* Always show status */}
                    <View style={styles.statCard}>
                      <Ionicons 
                        name={listing.status === 'active' ? 'checkmark-circle' : 'pause-circle'} 
                        size={16} 
                        color={listing.status === 'active' ? '#10b981' : '#f59e0b'} 
                      />
                      <Text style={styles.statNumber}>•</Text>
                      <Text style={styles.statLabel}>
                        {listing.status === 'active' ? 'Active' : 
                         listing.status === 'paused' ? 'Paused' : 
                         listing.status === 'completed' ? 'Done' : 'Draft'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Contact & Location Details */}
              {(listing.location_lat && listing.location_lng) && (
                <View style={styles.expandedSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="location-outline" size={18} color="#f25842" />
                    <Text style={styles.sectionTitle}>Location Details</Text>
                  </View>
                  
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationDetailText}>
                      {listing.location_address || 'Location provided'}
                    </Text>
                    <View style={styles.mapButtonsContainer}>
                      <Pressable
                        style={styles.mapButton}
                        onPress={async () => {
                          const mapsUrl = Platform.OS === 'ios' 
                            ? `http://maps.apple.com/?q=${listing.location_lat},${listing.location_lng}`
                            : `https://www.google.com/maps/search/?api=1&query=${listing.location_lat},${listing.location_lng}`
                          try {
                            await Linking.openURL(mapsUrl)
                          } catch (error) {
                            console.error('Failed to open Maps:', error)
                          }
                        }}
                      >
                        <Ionicons name="map-outline" size={16} color="#ffffff" />
                        <Text style={styles.mapButtonText}>Open in Maps</Text>
                      </Pressable>
                      
                      <Pressable
                        style={styles.wazeButton}
                        onPress={async () => {
                          const wazeUrl = `https://waze.com/ul?ll=${listing.location_lat},${listing.location_lng}&navigate=yes&utm_source=izimate-job`
                          try {
                            await Linking.openURL(wazeUrl)
                          } catch (error) {
                            console.error('Failed to open Waze:', error)
                          }
                        }}
                      >
                        <Ionicons name="navigate-outline" size={16} color="#ffffff" />
                        <Text style={styles.wazeButtonText}>Open in Waze</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
          
          {/* Expand/Collapse Button - Always show for better UX */}
          <Pressable
            style={({ pressed }) => [
              styles.expandButton,
              pressed && styles.expandButtonPressed,
            ]}
            onPress={handleToggleExpand}
            android_ripple={{ color: 'rgba(242, 88, 66, 0.1)' }}
          >
            <Ionicons 
              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
              size={16} 
              color="#f25842" 
            />
            <Text style={styles.expandButtonText}>
              {isExpanded ? 'Show Less Details' : 'View More Details'}
            </Text>
            <Ionicons 
              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
              size={16} 
              color="#f25842" 
            />
          </Pressable>

          {/* Edit/Delete Action Buttons - for offer page (user's own listings) */}
          {showActions && onEdit && onDelete && (
            <View style={styles.actionButtonsContainer}>
              <Pressable
                style={styles.editActionButton}
                onPress={() => onEdit(listing.id)}
              >
                <Ionicons name="create-outline" size={18} color="#3b82f6" />
                <Text style={styles.editActionButtonText}>Edit</Text>
              </Pressable>
              <Pressable
                style={[styles.deleteActionButton, isDeleting && styles.deleteActionButtonDisabled]}
                onPress={() => onDelete(listing.id)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    <Text style={styles.deleteActionButtonText}>Delete</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {/* Like/Dislike/Chat Action Buttons - for find page (all listings, except own) */}
          {showLikeButtons && !isOwnListing && (
            <View style={styles.likeButtonsContainer}>
              <Pressable
                style={styles.dislikeButton}
                onPress={() => onDislike?.(listing.id)}
              >
                <Ionicons name="close" size={24} color="#ef4444" />
              </Pressable>
              <Pressable
                style={styles.chatButton}
                onPress={() => onChat?.(listing.id)}
              >
                <Ionicons name="chatbubble-ellipses" size={22} color="#fbbf24" />
              </Pressable>
              <Pressable
                style={styles.likeButton}
                onPress={() => onLike?.(listing.id)}
              >
                <Ionicons name="heart" size={24} color="#10b981" />
              </Pressable>
            </View>
          )}

          {/* Booking Button - for bookable services */}
          {showBookingButton && !isOwnListing && listing.booking_enabled && (
            <View style={styles.bookingButtonContainer}>
              <Pressable
                style={styles.bookingButton}
                onPress={() => router.push(`/booking/${listing.id}`)}
              >
                <Ionicons name="calendar" size={20} color="#ffffff" />
                <Text style={styles.bookingButtonText}>Book Appointment</Text>
              </Pressable>
            </View>
          )}
        </View>

    </View>
  )
}

const styles = StyleSheet.create({
  listingCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#e6f2ff', // Very light blue color
    alignSelf: 'center',
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: '#f3f4f6',
    flexShrink: 0,
    width: '100%',
  },
  imageScrollView: {
    width: '100%',
    height: '100%',
  },
  listingImage: {
    height: '100%',
    backgroundColor: '#e5e7eb',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  imageIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  imageIndicatorActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  imageArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imageArrowLeft: {
    left: 12,
  },
  imageArrowRight: {
    right: 12,
  },
  imageArrowDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  distanceBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  distanceText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  listingContent: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 20, // Ensure padding at bottom for action buttons
    flexShrink: 0,
  },
  customerSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  customerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerDetails: {
    flex: 1,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    color: '#1a1a1a',
    fontWeight: '600',
    marginLeft: 4,
  },
  positivePercentage: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '400',
    marginLeft: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 10,
    color: '#7c3aed',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  listingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 28,
  },
  listingMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#6b7280',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  directionsButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    marginLeft: 'auto',
  },
  directionsButtonText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
  },
  listingDescription: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#f25842',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 11,
    color: '#6b7280',
    alignSelf: 'center',
    marginLeft: 4,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(242, 88, 66, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(242, 88, 66, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 8,
    width: '100%',
  },
  expandButtonPressed: {
    opacity: 0.8,
    backgroundColor: 'rgba(242, 88, 66, 0.2)',
  },
  expandButtonText: {
    fontSize: 14,
    color: '#f25842',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    width: '100%',
  },
  editActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
    flex: 1,
    justifyContent: 'center',
  },
  editActionButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  deleteActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    flex: 1,
    justifyContent: 'center',
  },
  deleteActionButtonText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  deleteActionButtonDisabled: {
    opacity: 0.5,
  },
  likeButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    width: '100%',
  },
  dislikeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  chatButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#fbbf24',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  likeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  bookingButtonContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    width: '100%',
  },
  bookingButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  bookingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  expandedDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 20,
  },
  expandedSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  fullDescription: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  scheduleGrid: {
    gap: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  scheduleLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  scheduleValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  urgencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  urgentText: {
    color: '#ef4444',
  },
  budgetBreakdown: {
    gap: 12,
  },
  budgetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  budgetLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  budgetValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  priceListSection: {
    gap: 8,
  },
  priceListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  priceListServiceName: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  priceListPrice: {
    fontSize: 16,
    color: '#f25842',
    fontWeight: '700',
  },
  timeSlotsContainer: {
    gap: 12,
  },
  timeSlotsTitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
    marginTop: 8,
  },
  daySlotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dayName: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
    minWidth: 90,
  },
  slotsForDay: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  slotTime: {
    fontSize: 13,
    color: '#4b5563',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  bookingAvailability: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginTop: 8,
  },
  bookingAvailabilityText: {
    fontSize: 14,
    color: '#15803d',
    fontWeight: '600',
  },
  bookingServiceName: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  locationDetails: {
    gap: 12,
  },
  locationDetailText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  mapButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  mapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f25842',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  mapButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  wazeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  wazeButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  categoryBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(242, 88, 66, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  urgencyBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  urgencyBadgeASAP: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  urgencyBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
})
