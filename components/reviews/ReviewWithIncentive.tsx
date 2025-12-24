/**
 * Review Form with Incentive Display
 * Shows discount reward for leaving a review
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RatingCriteria } from '../profile/RatingCriteria';
import { processReviewWithIncentive, getReviewIncentiveSettings } from '../../lib/utils/review-incentives';
import { supabase } from '../../lib/supabase';

interface ReviewWithIncentiveProps {
  revieweeId: string;
  revieweeName: string;
  bookingId?: string;
  serviceType?: string;
  visible: boolean;
  onClose: () => void;
  onSubmitted: (reviewId: string, couponCode?: string) => void;
}

export const ReviewWithIncentive: React.FC<ReviewWithIncentiveProps> = ({
  revieweeId,
  revieweeName,
  bookingId,
  serviceType,
  visible,
  onClose,
  onSubmitted,
}) => {
  const [ratings, setRatings] = useState({
    asDescribed: 0,
    timing: 0,
    communication: 0,
    cost: 0,
    performance: 0,
  });
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [incentiveSettings, setIncentiveSettings] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadIncentiveSettings();
    loadCurrentUser();
  }, [revieweeId, bookingId]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const loadIncentiveSettings = async () => {
    try {
      const settings = await getReviewIncentiveSettings(revieweeId, bookingId);
      setIncentiveSettings(settings);
    } catch (error) {
      console.error('Failed to load incentive settings:', error);
    }
  };

  const calculateOverallRating = () => {
    const sum = ratings.asDescribed + ratings.timing + ratings.communication + ratings.cost + ratings.performance;
    return sum / 5;
  };

  const isEligibleForIncentive = () => {
    if (!incentiveSettings || !incentiveSettings.enabled) return false;
    
    const overallRating = calculateOverallRating();
    const meetsMinRating = overallRating >= incentiveSettings.min_rating;
    const hasTextReview = !incentiveSettings.require_text_review || reviewText.trim().length > 0;
    
    return meetsMinRating && hasTextReview;
  };

  const getIncentivePreview = () => {
    if (!isEligibleForIncentive()) return null;

    const overallRating = calculateOverallRating();
    let discountText = '';

    if (incentiveSettings.discount_percentage) {
      discountText = `${incentiveSettings.discount_percentage}% OFF`;
    } else if (incentiveSettings.discount_amount) {
      discountText = `£${incentiveSettings.discount_amount} OFF`;
    }

    return {
      discountText,
      message: incentiveSettings.incentive_message || 'Thank you for your review!',
    };
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Please log in to submit a review');
      return;
    }

    // Validate ratings
    const hasAllRatings = Object.values(ratings).every(r => r > 0);
    if (!hasAllRatings) {
      Alert.alert('Incomplete Review', 'Please rate all criteria');
      return;
    }

    if (incentiveSettings?.require_text_review && !reviewText.trim()) {
      Alert.alert('Review Required', 'Please write a review to receive your discount');
      return;
    }

    setLoading(true);
    try {
      const result = await processReviewWithIncentive(
        {
          reviewer_id: currentUser.id,
          reviewee_id: revieweeId,
          booking_id: bookingId,
          ratings,
          reviewText: reviewText.trim() || undefined,
          serviceType,
        },
        bookingId
      );

      if (result.couponCode) {
        Alert.alert(
          'Review Submitted! 🎉',
          `Thank you for your review! Your discount code is: ${result.couponCode}\n\n${incentiveSettings?.incentive_message || 'Use it on your next booking!'}`,
          [
            {
              text: 'OK',
              onPress: () => {
                onSubmitted(result.reviewId, result.couponCode);
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Review Submitted!',
          'Thank you for your feedback.',
          [
            {
              text: 'OK',
              onPress: () => {
                onSubmitted(result.reviewId);
                onClose();
              }
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('Failed to submit review:', error);
      Alert.alert('Error', error.message || 'Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const incentivePreview = getIncentivePreview();
  const overallRating = calculateOverallRating();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </Pressable>
          <Text style={styles.headerTitle}>Rate {revieweeName}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Incentive Banner */}
          {incentiveSettings?.enabled && (
            <View style={styles.incentiveBanner}>
              <Ionicons name="gift" size={24} color="#f59e0b" />
              <View style={styles.incentiveContent}>
                <Text style={styles.incentiveTitle}>Earn a Discount! 🎁</Text>
                <Text style={styles.incentiveText}>
                  {incentiveSettings.min_rating >= 4.0 
                    ? `Rate ${incentiveSettings.min_rating}+ stars`
                    : `Rate ${incentiveSettings.min_rating} or more stars`}
                  {incentiveSettings.require_text_review && ' and write a review'}
                  {' '}to get {incentivePreview?.discountText || 'a discount'}!
                </Text>
              </View>
            </View>
          )}

          {/* Rating Criteria */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rate Your Experience</Text>
            <RatingCriteria
              ratings={{
                asDescribed: ratings.asDescribed,
                timing: ratings.timing,
                communication: ratings.communication,
                overallCost: ratings.cost,
                performance: ratings.performance,
              }}
              totalReviews={0}
            />
          </View>

          {/* Rating Inputs */}
          <View style={styles.ratingInputs}>
            {[
              { key: 'asDescribed', label: 'As Described', icon: 'checkmark-circle' },
              { key: 'timing', label: 'Timing', icon: 'time' },
              { key: 'communication', label: 'Communication', icon: 'chatbubbles' },
              { key: 'cost', label: 'Value for Money', icon: 'card' },
              { key: 'performance', label: 'Overall Experience', icon: 'trophy' },
            ].map(({ key, label, icon }) => (
              <View key={key} style={styles.ratingRow}>
                <View style={styles.ratingLabel}>
                  <Ionicons name={icon as any} size={18} color="#666" />
                  <Text style={styles.ratingLabelText}>{label}</Text>
                </View>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => setRatings({ ...ratings, [key]: star })}
                      style={styles.starButton}
                    >
                      <Ionicons
                        name={ratings[key as keyof typeof ratings] >= star ? 'star' : 'star-outline'}
                        size={28}
                        color={ratings[key as keyof typeof ratings] >= star ? '#f59e0b' : '#ddd'}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {/* Overall Rating Display */}
          {overallRating > 0 && (
            <View style={styles.overallRating}>
              <Text style={styles.overallRatingLabel}>Overall Rating</Text>
              <View style={styles.overallRatingValue}>
                <Text style={styles.overallRatingNumber}>{overallRating.toFixed(1)}</Text>
                <Ionicons name="star" size={24} color="#f59e0b" />
              </View>
              {incentivePreview && (
                <View style={styles.eligibleBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={styles.eligibleText}>Eligible for {incentivePreview.discountText}</Text>
                </View>
              )}
            </View>
          )}

          {/* Review Text */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Write a Review {incentiveSettings?.require_text_review && '*'}
            </Text>
            <TextInput
              style={styles.reviewInput}
              placeholder="Share your experience..."
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            {incentiveSettings?.require_text_review && (
              <Text style={styles.hint}>A written review is required to receive your discount</Text>
            )}
          </View>

          {/* Submit Button */}
          <Pressable
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Submit Review</Text>
                {incentivePreview && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>{incentivePreview.discountText}</Text>
                  </View>
                )}
              </>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  incentiveBanner: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  incentiveContent: {
    flex: 1,
    marginLeft: 12,
  },
  incentiveTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },
  incentiveText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  ratingInputs: {
    marginBottom: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 8,
  },
  ratingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  ratingLabelText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  starButton: {
    padding: 4,
  },
  overallRating: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  overallRatingLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  overallRatingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overallRatingNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
  },
  eligibleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#d1fae5',
    borderRadius: 20,
  },
  eligibleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  reviewInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  hint: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 6,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  discountBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
