import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface RatingCriteriaProps {
  ratings: {
    asDescribed: number
    timing: number
    communication: number
    overallCost: number
    performance: number
  }
  totalReviews: number
}

export function RatingCriteria({ ratings, totalReviews }: RatingCriteriaProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const criteriaList = [
    {
      key: 'asDescribed',
      label: 'As Described',
      icon: 'checkmark-circle',
      color: '#10b981',
      value: ratings.asDescribed,
    },
    {
      key: 'timing',
      label: 'Timing',
      icon: 'time',
      color: '#3b82f6',
      value: ratings.timing,
    },
    {
      key: 'communication',
      label: 'Communication',
      icon: 'chatbubbles',
      color: '#8b5cf6',
      value: ratings.communication,
    },
    {
      key: 'overallCost',
      label: 'Cost',
      icon: 'card',
      color: '#f59e0b',
      value: ratings.overallCost,
    },
    {
      key: 'performance',
      label: 'Overall Experience',
      icon: 'trophy',
      color: '#f25842',
      value: ratings.performance,
    },
  ]

  const overallRating = (
    ratings.asDescribed +
    ratings.timing +
    ratings.communication +
    ratings.overallCost +
    ratings.performance
  ) / 5

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Ionicons key={i} name="star" size={14} color="#fbbf24" />
        )
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Ionicons key={i} name="star-half" size={14} color="#fbbf24" />
        )
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={14} color="#d1d5db" />
        )
      }
    }
    return stars
  }

  const getPercentage = (rating: number) => {
    return Math.round((rating / 5) * 100)
  }

  return (
    <View style={styles.container}>
      {/* Overall Rating Header with Summary Stats */}
      <View style={styles.overallSection}>
        {/* Summary Stats - Replacing "88% Positive" */}
        <View style={styles.summarySection}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {getPercentage(overallRating)}%
            </Text>
            <Text style={styles.summaryLabel}>Positive Rating</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {criteriaList.filter(c => c.value >= 4.5).length}/5
            </Text>
            <Text style={styles.summaryLabel}>Excellent Areas</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {totalReviews}
            </Text>
            <Text style={styles.summaryLabel}>Total Reviews</Text>
          </View>
        </View>

        {/* Stars and Subtext */}
        <View style={styles.overallRating}>
          <View style={styles.overallStars}>
            {renderStars(overallRating)}
          </View>
          <Text style={styles.overallSubtext}>
            {totalReviews > 0 
              ? `Based on ${totalReviews} ${totalReviews === 1 ? 'review' : 'reviews'}`
              : 'Complete jobs to receive your first review'
            }
          </Text>
        </View>
      </View>

      {/* Criteria Breakdown - Collapsible */}
      <View style={styles.criteriaSection}>
        <Pressable 
          style={styles.criteriaHeader}
          onPress={() => setIsExpanded(!isExpanded)}
        >
        <Text style={styles.criteriaTitle}>Rating Breakdown</Text>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#6b7280" 
          />
        </Pressable>
        
        {isExpanded && (
          <View style={styles.criteriaContent}>
        {criteriaList.map((criteria) => (
          <View key={criteria.key} style={styles.criteriaItem}>
                <View style={styles.criteriaItemHeader}>
              <View style={styles.criteriaLabelRow}>
                <Ionicons 
                  name={criteria.icon as any} 
                  size={16} 
                  color={criteria.color} 
                />
                <Text style={styles.criteriaLabel}>{criteria.label}</Text>
              </View>
              <View style={styles.criteriaValueRow}>
                <Text style={styles.criteriaValue}>{criteria.value.toFixed(1)}</Text>
                <Text style={styles.criteriaPercentage}>
                  {getPercentage(criteria.value)}%
                </Text>
              </View>
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${getPercentage(criteria.value)}%`,
                    backgroundColor: criteria.color 
                  }
                ]} 
              />
            </View>
            
            {/* Star Rating */}
            <View style={styles.criteriaStars}>
              {renderStars(criteria.value)}
            </View>
          </View>
        ))}
      </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  overallSection: {
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 20,
  },
  overallRating: {
    alignItems: 'center',
  },
  overallStars: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  overallSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 12,
    marginBottom: 16,
  },
  criteriaSection: {
    marginBottom: 20,
  },
  criteriaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  criteriaTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  criteriaContent: {
    marginTop: 12,
  },
  criteriaItem: {
    marginBottom: 16,
  },
  criteriaItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  criteriaLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  criteriaLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  criteriaValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  criteriaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  criteriaPercentage: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  criteriaStars: {
    flexDirection: 'row',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
})