/**
 * Quick Event Form Component
 * Event form with integrated service search and collapsible filters
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { getCurrentLocation, calculateDistance } from '@/lib/utils/location';
import type { Listing, User } from '@/lib/types';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface QuickEventFormProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD format
  userId: string;
  viewType: 'customer' | 'provider';
  onEventCreated?: () => void;
}

interface EnrichedListing extends Listing {
  provider?: User;
  distance?: number;
  rating?: number;
}

export const QuickEventForm: React.FC<QuickEventFormProps> = ({
  visible,
  onClose,
  selectedDate,
  userId,
  viewType,
  onEventCreated,
}) => {
  // Form state
  const [eventTitle, setEventTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Service search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EnrichedListing[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedService, setSelectedService] = useState<EnrichedListing | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);
  
  // Availability filters
  const [filterDate, setFilterDate] = useState(selectedDate);
  const [filterStartTime, setFilterStartTime] = useState('09:00');
  const [filterEndTime, setFilterEndTime] = useState('17:00');
  
  // Price filter
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  
  // Distance filter
  const [maxDistance, setMaxDistance] = useState('');
  
  // Rating filter
  const [minRating, setMinRating] = useState('');

  useEffect(() => {
    if (visible) {
      loadUserLocation();
    }
  }, [visible]);

  const loadUserLocation = async () => {
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
    } catch (error) {
      console.warn('Could not get user location:', error);
    }
  };

  // Search for services when query changes
  useEffect(() => {
    if (searchQuery.trim().length > 2) {
      const debounce = setTimeout(() => {
        searchServices();
      }, 500);
      return () => clearTimeout(debounce);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchQuery]);

  const searchServices = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    setShowResults(true);
    
    try {
      const query = searchQuery.toLowerCase();
      
      // Fetch listings similar to find page
      let queryBuilder = supabase
        .from('listings')
        .select(`
          *,
          provider:users!user_id(*)
        `)
        .eq('status', 'active')
        .eq('booking_enabled', true)
        .gte('expires_at', new Date().toISOString());

      const { data: listingsData, error} = await queryBuilder
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get all unique provider IDs for batch review query
      const providerIds = [...new Set(
        (listingsData || [])
          .map((l: any) => l.provider?.id || l.user_id)
          .filter(Boolean)
      )];

      // Batch fetch all reviews for all providers in one query
      const { data: allReviews } = providerIds.length > 0
        ? await supabase
            .from('reviews')
            .select('reviewee_id, rating')
            .in('reviewee_id', providerIds)
        : { data: null };

      // Create a map of provider_id -> reviews for fast lookup
      const reviewsMap = new Map<string, number[]>();
      if (allReviews) {
        allReviews.forEach((review: any) => {
          if (!reviewsMap.has(review.reviewee_id)) {
            reviewsMap.set(review.reviewee_id, []);
          }
          reviewsMap.get(review.reviewee_id)!.push(review.rating);
        });
      }

      // Enrich listings (all in-memory, no more queries)
      let enriched = (listingsData || []).map((listing: any) => {
          const enrichedListing: EnrichedListing = {
            ...listing,
            provider: listing.provider as unknown as User,
          };

          // Calculate distance
          if (userLocation && listing.location_lat && listing.location_lng) {
            enrichedListing.distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              listing.location_lat,
              listing.location_lng
            );
          }

        // Get rating from reviews map
          if (listing.provider) {
            const providerData = listing.provider as unknown as User;
          const reviews = reviewsMap.get(providerData.id) || [];

          if (reviews.length > 0) {
            const avgRating = reviews.reduce((sum, r) => sum + (r || 0), 0) / reviews.length;
              enrichedListing.rating = Math.round(avgRating * 10) / 10;
            }
          }

          return enrichedListing;
      });

      // Apply filters
      enriched = applyFilters(enriched);
      
      setSearchResults(enriched);
    } catch (error) {
      console.error('Error searching services:', error);
      Alert.alert('Error', 'Failed to search services');
    } finally {
      setSearchLoading(false);
    }
  };

  const applyFilters = (listings: EnrichedListing[]) => {
    let filtered = [...listings];

    // Price filter
    if (minPrice) {
      const min = parseFloat(minPrice);
      filtered = filtered.filter(l => l.budget_min && l.budget_min >= min);
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      filtered = filtered.filter(l => !l.budget_max || l.budget_max <= max);
    }

    // Distance filter
    if (maxDistance && userLocation) {
      const maxDist = parseFloat(maxDistance);
      filtered = filtered.filter(l => l.distance && l.distance <= maxDist);
    }

    // Rating filter
    if (minRating) {
      const minRat = parseFloat(minRating);
      filtered = filtered.filter(l => l.rating && l.rating >= minRat);
    }

    return filtered;
  };

  const handleSelectService = (service: EnrichedListing) => {
    setSelectedService(service);
    setEventTitle(service.title || '');
    setPrice(service.budget_min?.toString() || '');
    setDescription(service.description || '');
    setSearchQuery('');
    setShowResults(false);
    
    // Set duration if available
    if (service.service_options && Array.isArray(service.service_options) && service.service_options.length > 0) {
      const firstOption = service.service_options[0] as any;
      const durationMinutes = firstOption.duration || service.default_duration_minutes || 60;
      const endTimeDate = new Date(`${selectedDate}T${startTime}:00`);
      endTimeDate.setMinutes(endTimeDate.getMinutes() + durationMinutes);
      setEndTime(endTimeDate.toTimeString().slice(0, 5));
    }
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    if (startTime >= endTime) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    setLoading(true);
    try {
      const startDateTime = `${selectedDate}T${startTime}:00`;
      const endDateTime = `${selectedDate}T${endTime}:00`;

      let providerId: string | null = null;
      let customerId: string | null = null;
      let listingId: string | null = null;

      if (viewType === 'provider') {
        const { data: providerProfile } = await supabase
          .from('provider_profiles')
          .select('id')
          .eq('user_id', userId)
          .single();
        
        if (providerProfile) {
          providerId = providerProfile.id;
        }
        customerId = userId;
      } else {
        customerId = userId;
        if (selectedService && selectedService.provider) {
          const { data: providerProfile } = await supabase
            .from('provider_profiles')
            .select('id')
            .eq('user_id', selectedService.provider.id)
            .single();
          
          if (providerProfile) {
            providerId = providerProfile.id;
            listingId = selectedService.id;
          }
        }
      }

      const { error } = await supabase
        .from('bookings')
        .insert({
          customer_id: customerId,
          provider_id: providerId,
          listing_id: listingId,
          service_name: eventTitle.trim(),
          start_time: startDateTime,
          end_time: endDateTime,
          status: providerId && customerId !== userId ? 'pending' : 'confirmed',
          service_price: price ? parseFloat(price) : null,
          currency: selectedService?.currency || 'GBP',
          customer_notes: description.trim() || null,
        });

      if (error) throw error;

      Alert.alert('Success', 'Event created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            onClose();
            onEventCreated?.();
          }
        }
      ]);
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEventTitle('');
    setStartTime('09:00');
    setEndTime('10:00');
    setDescription('');
    setPrice('');
    setSelectedService(null);
    setSearchQuery('');
    setShowResults(false);
    setShowFilters(false);
    setExpandedFilter(null);
    setMinPrice('');
    setMaxPrice('');
    setMaxDistance('');
    setMinRating('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const toggleFilter = (filterName: string) => {
    setExpandedFilter(expandedFilter === filterName ? null : filterName);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#374151" />
          </Pressable>
          <Text style={styles.title}>New Event</Text>
          <Pressable 
            onPress={handleCreateEvent} 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Create</Text>
            )}
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Date Display */}
          <View style={styles.dateContainer}>
            <Ionicons name="calendar" size={20} color="#f25842" />
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          </View>

          {/* Search Box (for customers only) */}
          {viewType === 'customer' && (
            <View style={styles.searchSection}>
              <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={20} color="#6b7280" />
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search services (e.g., hairdresser)..."
                    placeholderTextColor="#9ca3af"
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={20} color="#6b7280" />
                    </Pressable>
                  )}
                </View>
                <Pressable 
                  style={styles.filterButton}
                  onPress={() => setShowFilters(!showFilters)}
                >
                  <Ionicons 
                    name={showFilters ? "funnel" : "funnel-outline"} 
                    size={20} 
                    color={showFilters ? "#f25842" : "#6b7280"} 
                  />
                </Pressable>
              </View>

              {/* Collapsible Filters */}
              {showFilters && (
                <View style={styles.filtersContainer}>
                  {/* Availability Filter */}
                  <View style={styles.filterPanel}>
                    <Pressable 
                      style={styles.filterHeader}
                      onPress={() => toggleFilter('availability')}
                    >
                      <Text style={styles.filterHeaderText}>Availability</Text>
                      <Ionicons 
                        name={expandedFilter === 'availability' ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#6b7280" 
                      />
                    </Pressable>
                    {expandedFilter === 'availability' && (
                      <View style={styles.filterContent}>
                        <Text style={styles.filterLabel}>Date</Text>
                        <TextInput
                          style={styles.filterInput}
                          value={filterDate}
                          onChangeText={setFilterDate}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor="#9ca3af"
                        />
                        <View style={styles.timeRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.filterLabel}>From</Text>
                            <TextInput
                              style={styles.filterInput}
                              value={filterStartTime}
                              onChangeText={setFilterStartTime}
                              placeholder="09:00"
                              placeholderTextColor="#9ca3af"
                            />
                          </View>
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.filterLabel}>To</Text>
                            <TextInput
                              style={styles.filterInput}
                              value={filterEndTime}
                              onChangeText={setFilterEndTime}
                              placeholder="17:00"
                              placeholderTextColor="#9ca3af"
                            />
                          </View>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Price Filter */}
                  <View style={styles.filterPanel}>
                    <Pressable 
                      style={styles.filterHeader}
                      onPress={() => toggleFilter('price')}
                    >
                      <Text style={styles.filterHeaderText}>Price</Text>
                      <Ionicons 
                        name={expandedFilter === 'price' ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#6b7280" 
                      />
                    </Pressable>
                    {expandedFilter === 'price' && (
                      <View style={styles.filterContent}>
                        <View style={styles.timeRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.filterLabel}>Min (£)</Text>
                            <TextInput
                              style={styles.filterInput}
                              value={minPrice}
                              onChangeText={setMinPrice}
                              placeholder="0"
                              placeholderTextColor="#9ca3af"
                              keyboardType="numeric"
                            />
                          </View>
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.filterLabel}>Max (£)</Text>
                            <TextInput
                              style={styles.filterInput}
                              value={maxPrice}
                              onChangeText={setMaxPrice}
                              placeholder="1000"
                              placeholderTextColor="#9ca3af"
                              keyboardType="numeric"
                            />
                          </View>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Distance Filter */}
                  <View style={styles.filterPanel}>
                    <Pressable 
                      style={styles.filterHeader}
                      onPress={() => toggleFilter('distance')}
                    >
                      <Text style={styles.filterHeaderText}>Distance</Text>
                      <Ionicons 
                        name={expandedFilter === 'distance' ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#6b7280" 
                      />
                    </Pressable>
                    {expandedFilter === 'distance' && (
                      <View style={styles.filterContent}>
                        <Text style={styles.filterLabel}>Max Distance (km)</Text>
                        <TextInput
                          style={styles.filterInput}
                          value={maxDistance}
                          onChangeText={setMaxDistance}
                          placeholder="10"
                          placeholderTextColor="#9ca3af"
                          keyboardType="numeric"
                        />
                      </View>
                    )}
                  </View>

                  {/* Rating Filter */}
                  <View style={styles.filterPanel}>
                    <Pressable 
                      style={styles.filterHeader}
                      onPress={() => toggleFilter('rating')}
                    >
                      <Text style={styles.filterHeaderText}>Rating</Text>
                      <Ionicons 
                        name={expandedFilter === 'rating' ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#6b7280" 
                      />
                    </Pressable>
                    {expandedFilter === 'rating' && (
                      <View style={styles.filterContent}>
                        <Text style={styles.filterLabel}>Minimum Rating</Text>
                        <View style={styles.ratingButtons}>
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <Pressable
                              key={rating}
                              style={[
                                styles.ratingButton,
                                minRating === rating.toString() && styles.ratingButtonActive
                              ]}
                              onPress={() => setMinRating(minRating === rating.toString() ? '' : rating.toString())}
                            >
                              <Ionicons 
                                name="star" 
                                size={16} 
                                color={minRating === rating.toString() ? '#ffffff' : '#f59e0b'} 
                              />
                              <Text style={[
                                styles.ratingButtonText,
                                minRating === rating.toString() && styles.ratingButtonTextActive
                              ]}>
                                {rating}+
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Search Results */}
              {showResults && (
                <View style={styles.resultsContainer}>
                  {searchLoading ? (
                    <View style={styles.resultsLoading}>
                      <ActivityIndicator size="small" color="#f25842" />
                      <Text style={styles.resultsLoadingText}>Searching...</Text>
                    </View>
                  ) : searchResults.length === 0 ? (
                    <View style={styles.resultsEmpty}>
                      <Text style={styles.resultsEmptyText}>No services found</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.resultsCount}>
                        {searchResults.length} service{searchResults.length !== 1 ? 's' : ''} found
                      </Text>
                      {searchResults.map((service) => (
                        <Pressable 
                          key={service.id}
                          style={styles.resultCard}
                          onPress={() => handleSelectService(service)}
                        >
                          <View style={styles.resultHeader}>
                            <Text style={styles.resultTitle} numberOfLines={1}>
                              {service.title}
                            </Text>
                            {service.budget_min && (
                              <Text style={styles.resultPrice}>
                                £{service.budget_min}
                              </Text>
                            )}
                          </View>
                          {service.provider && (
                            <Text style={styles.resultProvider}>
                              by {service.provider.name}
                            </Text>
                          )}
                          <View style={styles.resultMeta}>
                            {service.category && (
                              <View style={styles.resultBadge}>
                                <Text style={styles.resultBadgeText}>{service.category}</Text>
                              </View>
                            )}
                            {service.rating !== undefined && (
                              <View style={styles.resultBadge}>
                                <Ionicons name="star" size={12} color="#f59e0b" />
                                <Text style={styles.resultBadgeText}>{service.rating}</Text>
                              </View>
                            )}
                            {service.distance !== undefined && (
                              <View style={styles.resultBadge}>
                                <Ionicons name="location" size={12} color="#6b7280" />
                                <Text style={styles.resultBadgeText}>{service.distance.toFixed(1)} km</Text>
                              </View>
                            )}
                          </View>
                        </Pressable>
                      ))}
                    </>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Selected Service Display */}
          {selectedService && (
            <View style={styles.selectedServiceCard}>
              <View style={styles.selectedServiceHeader}>
                <Text style={styles.selectedServiceLabel}>Selected Service</Text>
                <Pressable onPress={() => {
                  setSelectedService(null);
                  setEventTitle('');
                  setPrice('');
                  setDescription('');
                }}>
                  <Ionicons name="close-circle" size={24} color="#6b7280" />
                </Pressable>
              </View>
              <Text style={styles.selectedServiceTitle}>{selectedService.title}</Text>
              {selectedService.provider && (
                <Text style={styles.selectedServiceProvider}>
                  by {selectedService.provider.name}
                </Text>
              )}
            </View>
          )}

          {/* Event Title */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Event Title *</Text>
            <TextInput
              style={styles.input}
              value={eventTitle}
              onChangeText={setEventTitle}
              placeholder="Enter event title"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Time Selection */}
          <View style={styles.timeContainer}>
            <View style={styles.timeInputContainer}>
              <Text style={styles.label}>Start Time</Text>
              <TextInput
                style={styles.timeInput}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="09:00"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.timeInputContainer}>
              <Text style={styles.label}>End Time</Text>
              <TextInput
                style={styles.timeInput}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="10:00"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Price (for providers or if not from service) */}
          {(viewType === 'provider' || !selectedService) && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Price (Optional)</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>
          )}

          {/* Description */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add event details..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  saveButton: {
    backgroundColor: '#f25842',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f25842',
  },
  // Search Section
  searchSection: {
    marginBottom: 20,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Filters Container
  filtersContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  filterPanel: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ffffff',
  },
  filterHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  filterContent: {
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 6,
  },
  filterInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
  },
  ratingButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ratingButtonActive: {
    backgroundColor: '#f59e0b',
  },
  ratingButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  ratingButtonTextActive: {
    color: '#ffffff',
  },
  // Search Results
  resultsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 300,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  resultsLoading: {
    padding: 24,
    alignItems: 'center',
  },
  resultsLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  resultsEmpty: {
    padding: 24,
    alignItems: 'center',
  },
  resultsEmptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  resultCard: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  resultTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 8,
  },
  resultPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f25842',
  },
  resultProvider: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
  },
  resultMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  resultBadgeText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  // Selected Service
  selectedServiceCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  selectedServiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  selectedServiceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
  },
  selectedServiceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  selectedServiceProvider: {
    fontSize: 14,
    color: '#6b7280',
  },
  // Form Inputs
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
    textAlign: 'center',
  },
});

