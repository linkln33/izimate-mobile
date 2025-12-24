/**
 * External Reviews Manager
 * Manages and syncs reviews from Google, Yelp, etc.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { supabase } from '../../lib/supabase';
import { fetchGoogleReviews, searchGooglePlace, getGooglePlaceDetails } from '../../lib/utils/google-reviews';

interface ExternalReview {
  id: string;
  source: string;
  reviewer_name: string;
  reviewer_avatar_url?: string;
  rating: number;
  review_text: string;
  review_date: string;
  external_url?: string;
  provider_response?: string;
}

interface ExternalReviewsManagerProps {
  providerId: string;
  listingId?: string;
}

export const ExternalReviewsManager: React.FC<ExternalReviewsManagerProps> = ({
  providerId,
  listingId,
}) => {
  const [reviews, setReviews] = useState<ExternalReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState(
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || ''
  );
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    loadReviews();
    loadGoogleSettings();
  }, [providerId, listingId]);

  const loadGoogleSettings = async () => {
    try {
      const { data: profile } = await supabase
        .from('provider_profiles')
        .select('google_place_id, google_reviews_enabled')
        .eq('user_id', providerId)
        .single();

      if (profile?.google_place_id) {
        setGooglePlaceId(profile.google_place_id);
      }
    } catch (error) {
      console.error('Failed to load Google settings:', error);
    }
  };

  const loadReviews = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('external_reviews')
        .select('*')
        .eq('provider_id', providerId)
        .order('review_date', { ascending: false });

      if (listingId) {
        query = query.eq('listing_id', listingId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReviews((data || []) as ExternalReview[]);
    } catch (error) {
      console.error('Failed to load external reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchGooglePlace = async () => {
    // Use environment variable API key if not provided
    const apiKey = googleApiKey || process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      Alert.alert('Error', 'Google Places API key not configured. Please add EXPO_PUBLIC_GOOGLE_PLACES_API_KEY to your .env file or enter it manually.');
      return;
    }

    if (!googlePlaceId) {
      Alert.alert('Error', 'Please enter a business name or place ID to search');
      return;
    }

    setSyncing(true);
    try {
      // Use environment variable API key if not provided
      const apiKey = googleApiKey || process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';
      
      // Try to get place details directly if it's a place_id
      let placeDetails;
      
      if (googlePlaceId.startsWith('ChIJ') || googlePlaceId.length > 20) {
        // Looks like a place_id
        placeDetails = await getGooglePlaceDetails(googlePlaceId, apiKey);
      } else {
        // Search by name
        const searchResult = await searchGooglePlace(googlePlaceId, apiKey);
        if (!searchResult) {
          Alert.alert('Not Found', 'Could not find a place with that name');
          return;
        }
        placeDetails = await getGooglePlaceDetails(searchResult.place_id, apiKey);
      }

      if (!placeDetails || !placeDetails.reviews) {
        Alert.alert('No Reviews', 'No reviews found for this place');
        return;
      }

      // Save place_id to profile
      await supabase
        .from('provider_profiles')
        .update({
          google_place_id: placeDetails.place_id,
          google_business_name: placeDetails.name,
          google_reviews_enabled: true,
          google_reviews_last_sync: new Date().toISOString(),
        })
        .eq('user_id', providerId);

      // Import reviews
      await importGoogleReviews(placeDetails.reviews, placeDetails.place_id);
      
      Alert.alert('Success', `Imported ${placeDetails.reviews.length} reviews from Google`);
      await loadReviews();
      setShowSetup(false);
    } catch (error: any) {
      console.error('Failed to sync Google reviews:', error);
      Alert.alert('Error', error.message || 'Failed to sync Google reviews');
    } finally {
      setSyncing(false);
    }
  };

  const importGoogleReviews = async (googleReviews: any[], placeId: string) => {
    const reviewsToInsert = googleReviews.map((review) => ({
      provider_id: providerId,
      listing_id: listingId || null,
      source: 'google',
      external_review_id: `google_${placeId}_${review.time}`,
      external_url: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
      reviewer_name: review.author_name,
      reviewer_avatar_url: review.profile_photo_url,
      rating: review.rating,
      review_text: review.text,
      review_date: new Date(review.time * 1000).toISOString(),
      is_verified: true,
    }));

    const { error } = await supabase
      .from('external_reviews')
      .upsert(reviewsToInsert, {
        onConflict: 'provider_id,source,external_review_id',
      });

    if (error) throw error;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'google': return 'logo-google';
      case 'yelp': return 'restaurant';
      case 'facebook': return 'logo-facebook';
      default: return 'star';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source.toLowerCase()) {
      case 'google': return '#4285F4';
      case 'yelp': return '#D32323';
      case 'facebook': return '#1877F2';
      default: return '#666';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>External Reviews</Text>
        <Pressable
          style={styles.syncButton}
          onPress={() => setShowSetup(true)}
        >
          <Ionicons name="sync" size={20} color="#007AFF" />
          <Text style={styles.syncButtonText}>Sync</Text>
        </Pressable>
      </View>

      {showSetup && (
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Connect Google Reviews</Text>
          <Text style={styles.setupHint}>
            {googleApiKey 
              ? 'API key is configured. Enter your business name or Place ID to search.'
              : 'Enter your Google Places API key and business name or Place ID'}
          </Text>
          
          {!googleApiKey && (
            <TextInput
              style={styles.input}
              placeholder="Google Places API Key (optional - can use default)"
              value={googleApiKey}
              onChangeText={setGoogleApiKey}
              secureTextEntry
              autoCapitalize="none"
            />
          )}
          
          {googleApiKey && (
            <View style={styles.apiKeyConfigured}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.apiKeyConfiguredText}>API Key Configured</Text>
            </View>
          )}
          
          <TextInput
            style={styles.input}
            placeholder="Business Name or Place ID"
            value={googlePlaceId}
            onChangeText={setGooglePlaceId}
          />

          <View style={styles.setupActions}>
            <Pressable
              style={styles.cancelButton}
              onPress={() => setShowSetup(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.searchButton, syncing && styles.searchButtonDisabled]}
              onPress={handleSearchGooglePlace}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.searchButtonText}>Search & Sync</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      <ScrollView style={styles.reviewsList}>
        {reviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="star-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No external reviews</Text>
            <Text style={styles.emptySubtext}>
              Connect Google, Yelp, or other platforms to import reviews
            </Text>
          </View>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewerInfo}>
                  {review.reviewer_avatar_url ? (
                    <Image
                      source={{ uri: review.reviewer_avatar_url }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={20} color="#666" />
                    </View>
                  )}
                  <View style={styles.reviewerDetails}>
                    <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
                    <Text style={styles.reviewDate}>{formatDate(review.review_date)}</Text>
                  </View>
                </View>
                <View style={[styles.sourceBadge, { backgroundColor: getSourceColor(review.source) + '20' }]}>
                  <Ionicons name={getSourceIcon(review.source) as any} size={16} color={getSourceColor(review.source)} />
                  <Text style={[styles.sourceText, { color: getSourceColor(review.source) }]}>
                    {review.source.charAt(0).toUpperCase() + review.source.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= review.rating ? 'star' : 'star-outline'}
                    size={16}
                    color="#f59e0b"
                  />
                ))}
                <Text style={styles.ratingText}>{review.rating.toFixed(1)}</Text>
              </View>

              {review.review_text && (
                <Text style={styles.reviewText}>{review.review_text}</Text>
              )}

              {review.provider_response && (
                <View style={styles.responseContainer}>
                  <Text style={styles.responseLabel}>Your Response:</Text>
                  <Text style={styles.responseText}>{review.provider_response}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  setupCard: {
    backgroundColor: '#f9fafb',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  setupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  setupHint: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 12,
  },
  setupActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  searchButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  reviewsList: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  reviewCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerDetails: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  reviewText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  responseContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
  },
  apiKeyConfigured: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    marginBottom: 12,
  },
  apiKeyConfiguredText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#065f46',
  },
});
