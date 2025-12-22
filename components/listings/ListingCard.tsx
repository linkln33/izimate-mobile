import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Dimensions, Image, Pressable, Linking, Platform, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Listing, User } from '@/lib/types'
import { getMainPhoto } from '@/lib/utils/images'
import { formatBudget, getCurrencyFromUser } from '@/lib/utils/price'
import { formatDate, formatRelativeTime } from '@/lib/utils/date'
import { getUserCurrency } from '@/lib/utils/currency'

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
  userCurrency,
  userCountry,
}: ListingCardProps) {
  const [imageError, setImageError] = useState(false)
  const [internalExpanded, setInternalExpanded] = useState(false)
  const [dimensions, setDimensions] = useState(getDimensions())
  
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

  // Get first valid photo URL using shared utility
  const mainPhoto = getMainPhoto(listing.photos)
  
  // Debug logging for image URLs
  useEffect(() => {
    if (mainPhoto) {
      console.log('🖼️ ListingCard - Main photo URL:', mainPhoto)
      console.log('🖼️ ListingCard - All photos:', listing.photos)
    } else if (listing.photos && listing.photos.length > 0) {
      console.warn('⚠️ ListingCard - Photos array exists but getMainPhoto returned null:', listing.photos)
    }
  }, [mainPhoto, listing.photos])

  // Get currency: listing currency > user currency > country-based detection > default GBP
  const currencyCode = listing.currency || 
    (userCurrency ? getUserCurrency(userCurrency, userCountry) : 'GBP')
  
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

  return (
    <View style={[styles.listingCard, { maxWidth: cardMaxWidth, width: '100%' }]}>
        {/* Image Section - Fixed at top */}
        <View style={[styles.imageContainer, { height: finalImageHeight }]}>
          {mainPhoto && !imageError ? (
            <Image
              source={{ uri: mainPhoto }}
              style={styles.listingImage}
              resizeMode="cover"
              onError={(error) => {
                console.error('❌ Image load error for URL:', mainPhoto)
                console.error('Error details:', error)
                console.error('Listing photos array:', listing.photos)
                console.error('Listing ID:', listing.id)
                console.error('Image source:', { uri: mainPhoto })
                setImageError(true)
              }}
              onLoad={() => {
                console.log('✅ Image loaded successfully:', mainPhoto)
              }}
              onLoadStart={() => {
                console.log('🔄 Starting to load image:', mainPhoto)
              }}
            />
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
          {listing.photos && 
           Array.isArray(listing.photos) && 
           listing.photos.length > 1 && 
           listing.photos.some(p => p && typeof p === 'string' && p.trim().length > 0) && (
            <View style={styles.photoCountBadge}>
              <Ionicons name="images" size={14} color="#ffffff" />
              <Text style={styles.photoCountText}>
                {listing.photos.filter(p => p && typeof p === 'string' && p.trim().length > 0).length}
              </Text>
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
              {/* Date Posted and View Count - Same Line */}
              <View style={styles.dateViewsRow}>
                <View style={styles.dateViewsItem}>
                  <Ionicons name="time-outline" size={14} color="#6b7280" />
                  <Text style={styles.dateViewsText}>
                    Posted {formatRelativeTime(listing.created_at)}
                  </Text>
                </View>
                {listing.view_count > 0 && (
                  <View style={styles.dateViewsItem}>
                    <Ionicons name="eye-outline" size={14} color="#6b7280" />
                    <Text style={styles.dateViewsText}>{listing.view_count} views</Text>
                  </View>
                )}
              </View>

              {/* Other Stats */}
              {(listing.swipe_count > 0 || listing.match_count > 0) && (
                <View style={styles.statsRow}>
                  {listing.swipe_count > 0 && (
                    <View style={styles.statItem}>
                      <Ionicons name="heart-outline" size={14} color="#6b7280" />
                      <Text style={styles.statText}>{listing.swipe_count} likes</Text>
                    </View>
                  )}
                  {listing.match_count > 0 && (
                    <View style={styles.statItem}>
                      <Ionicons name="checkmark-circle-outline" size={14} color="#6b7280" />
                      <Text style={styles.statText}>{listing.match_count} matches</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Preferred Date */}
              {listing.preferred_date && (
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>
                    Preferred: {formatDate(listing.preferred_date)}
                  </Text>
                </View>
              )}
            </View>
          )}
          
          {/* Expand/Collapse Button - only show if not showing any action buttons */}
          {!showActions && !showLikeButtons && !isOwnListing && (
            <Pressable
              style={({ pressed }) => [
                styles.expandButton,
                pressed && styles.expandButtonPressed,
              ]}
              onPress={handleToggleExpand}
              android_ripple={{ color: 'rgba(242, 88, 66, 0.1)' }}
            >
              <Text style={styles.expandButtonText}>
                {isExpanded ? 'Show Less' : 'See More'}
              </Text>
              <Ionicons 
                name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                size={12} 
                color="#f25842" 
              />
            </Pressable>
          )}

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
  listingImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e5e7eb',
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
  photoCountBadge: {
    position: 'absolute',
    top: 60,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  photoCountText: {
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
    gap: 4,
    backgroundColor: 'rgba(242, 88, 66, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(242, 88, 66, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 12,
    marginBottom: 8,
  },
  expandButtonPressed: {
    opacity: 0.8,
  },
  expandButtonText: {
    fontSize: 11,
    color: '#f25842',
    fontWeight: '700',
    letterSpacing: 0.3,
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
  expandedDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  dateViewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 16,
  },
  dateViewsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dateViewsText: {
    fontSize: 13,
    color: '#6b7280',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#6b7280',
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
