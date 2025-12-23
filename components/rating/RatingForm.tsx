import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'

interface RatingFormProps {
  revieweeId: string
  revieweeName: string
  serviceType?: string
  jobId?: string
  onSubmitted?: () => void
  onCancel?: () => void
}

interface RatingCriteria {
  asDescribed: number
  timing: number
  communication: number
  cost: number
  performance: number
}

export function RatingForm({ 
  revieweeId, 
  revieweeName, 
  serviceType = 'general',
  jobId,
  onSubmitted,
  onCancel 
}: RatingFormProps) {
  const [ratings, setRatings] = useState<RatingCriteria>({
    asDescribed: 0,
    timing: 0,
    communication: 0,
    cost: 0,
    performance: 0,
  })
  
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const criteriaConfig = [
    {
      key: 'asDescribed' as keyof RatingCriteria,
      label: 'As Described',
      icon: 'checkmark-circle',
      color: '#10b981',
      description: 'Did the service match what was promised?',
    },
    {
      key: 'timing' as keyof RatingCriteria,
      label: 'Timing',
      icon: 'time',
      color: '#3b82f6',
      description: 'Was the work completed on time?',
    },
    {
      key: 'communication' as keyof RatingCriteria,
      label: 'Communication',
      icon: 'chatbubbles',
      color: '#8b5cf6',
      description: 'How was the communication throughout?',
    },
    {
      key: 'cost' as keyof RatingCriteria,
      label: 'Cost',
      icon: 'card',
      color: '#f59e0b',
      description: 'Was the service good value for money?',
    },
    {
      key: 'performance' as keyof RatingCriteria,
      label: 'Overall Experience',
      icon: 'trophy',
      color: '#f25842',
      description: 'How would you rate the overall experience?',
    },
  ]

  const renderStars = (criteriaKey: keyof RatingCriteria) => {
    const rating = ratings[criteriaKey]
    const stars = []

    for (let i = 1; i <= 5; i++) {
      const filled = i <= rating
      stars.push(
        <Pressable
          key={i}
          onPress={() => setRatings(prev => ({ ...prev, [criteriaKey]: i }))}
          style={styles.starButton}
        >
          <Ionicons
            name={filled ? 'star' : 'star-outline'}
            size={32}
            color={filled ? '#fbbf24' : '#d1d5db'}
          />
        </Pressable>
      )
    }

    return stars
  }

  const isFormValid = () => {
    return Object.values(ratings).every(rating => rating > 0)
  }

  const handleSubmit = async () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Rating', 'Please rate all criteria before submitting.')
      return
    }

    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      const reviewData = {
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        job_id: jobId || null,
        as_described: ratings.asDescribed,
        timing: ratings.timing,
        communication: ratings.communication,
        cost: ratings.cost,
        performance: ratings.performance,
        review_text: reviewText.trim() || null,
        service_type: serviceType,
      }

      const { error } = await supabase
        .from('reviews')
        .insert([reviewData])

      if (error) {
        console.error('Review submission error:', error)
        throw error
      }

      Alert.alert(
        'Review Submitted!',
        `Thank you for rating ${revieweeName}. Your feedback helps improve the community.`,
        [{ text: 'OK', onPress: onSubmitted }]
      )
    } catch (error: any) {
      console.error('Failed to submit review:', error)
      Alert.alert(
        'Submission Failed',
        error.message || 'Failed to submit your review. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const overallRating = Object.values(ratings).reduce((sum, rating) => sum + rating, 0) / 5

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Rate Your Experience</Text>
        <Text style={styles.subtitle}>
          How was your experience with {revieweeName}?
        </Text>
      </View>

      {/* Overall Rating Display */}
      {overallRating > 0 && (
        <View style={styles.overallSection}>
          <Text style={styles.overallRating}>
            {overallRating.toFixed(1)} / 5.0
          </Text>
          <Text style={styles.overallLabel}>Overall Rating</Text>
        </View>
      )}

      {/* Rating Criteria */}
      <View style={styles.criteriaSection}>
        {criteriaConfig.map((criteria) => (
          <View key={criteria.key} style={styles.criteriaItem}>
            <View style={styles.criteriaHeader}>
              <View style={styles.criteriaLabelRow}>
                <Ionicons 
                  name={criteria.icon as any} 
                  size={20} 
                  color={criteria.color} 
                />
                <View style={styles.criteriaTextContainer}>
                  <Text style={styles.criteriaLabel}>{criteria.label}</Text>
                  <Text style={styles.criteriaDescription}>
                    {criteria.description}
                  </Text>
                </View>
              </View>
              <Text style={styles.ratingValue}>
                {ratings[criteria.key] > 0 ? `${ratings[criteria.key]}/5` : 'Rate'}
              </Text>
            </View>
            
            <View style={styles.starsContainer}>
              {renderStars(criteria.key)}
            </View>
          </View>
        ))}
      </View>

      {/* Optional Review Text */}
      <View style={styles.textSection}>
        <Text style={styles.textLabel}>Additional Comments (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Share more details about your experience..."
          value={reviewText}
          onChangeText={setReviewText}
          multiline
          numberOfLines={4}
          maxLength={500}
        />
        <Text style={styles.characterCount}>
          {reviewText.length}/500 characters
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Pressable 
          style={[styles.button, styles.cancelButton]} 
          onPress={onCancel}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        
        <Pressable 
          style={[
            styles.button, 
            styles.submitButton,
            (!isFormValid() || submitting) && styles.disabledButton
          ]} 
          onPress={handleSubmit}
          disabled={!isFormValid() || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Review</Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  overallSection: {
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  overallRating: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f25842',
  },
  overallLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  criteriaSection: {
    marginBottom: 24,
  },
  criteriaItem: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  criteriaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  criteriaLabelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  criteriaTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  criteriaLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  criteriaDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f25842',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  starButton: {
    padding: 4,
  },
  textSection: {
    marginBottom: 24,
  },
  textLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    backgroundColor: '#f25842',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  disabledButton: {
    opacity: 0.5,
  },
})