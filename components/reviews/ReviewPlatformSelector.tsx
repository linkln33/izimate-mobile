/**
 * Review Platform Selector Component
 * Displays options for customers to leave reviews on different platforms
 */

import { View, Text, Pressable, StyleSheet, Linking, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { processExternalReview } from '@/lib/utils/external-review-verification'

interface ReviewPlatformSelectorProps {
  bookingId?: string
  providerId: string
  listingId?: string
  customerId: string
  incentiveSettings: {
    enabled: boolean
    review_platforms?: string[]
    facebook_page_url?: string
    google_business_url?: string
    incentive_message?: string
  }
  onReviewSubmitted?: (platform: string, couponCode?: string) => void
}

export function ReviewPlatformSelector({
  bookingId,
  providerId,
  listingId,
  customerId,
  incentiveSettings,
  onReviewSubmitted,
}: ReviewPlatformSelectorProps) {
  if (!incentiveSettings.enabled) {
    return null
  }

  const platforms = incentiveSettings.review_platforms || ['in_app']

  const handlePlatformReview = async (platform: 'in_app' | 'facebook' | 'google') => {
    if (platform === 'in_app') {
      // Navigate to in-app review (handled by parent component)
      onReviewSubmitted?.('in_app')
      return
    }

    // For external platforms, open the review URL
    let reviewUrl = ''
    if (platform === 'facebook' && incentiveSettings.facebook_page_url) {
      reviewUrl = incentiveSettings.facebook_page_url
    } else if (platform === 'google' && incentiveSettings.google_business_url) {
      reviewUrl = incentiveSettings.google_business_url
    }

    if (!reviewUrl) {
      Alert.alert('Error', `${platform} review URL not configured`)
      return
    }

    // Open external review URL
    const canOpen = await Linking.canOpenURL(reviewUrl)
    if (canOpen) {
      await Linking.openURL(reviewUrl)
      
      // Show prompt to submit review URL for verification
      Alert.alert(
        'Review Submitted?',
        'After leaving your review, please paste the review URL here for automatic verification and to receive your discount.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Submit Review URL',
            onPress: () => promptReviewUrl(platform, reviewUrl),
          },
        ]
      )
    } else {
      Alert.alert('Error', `Cannot open ${platform} review page`)
    }
  }

  const promptReviewUrl = async (platform: 'facebook' | 'google', defaultUrl: string) => {
    // In a real implementation, you'd show a text input modal
    // For now, we'll use the default URL and attempt verification
    Alert.prompt(
      'Review URL',
      'Please paste the URL of your review:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Verify',
          onPress: async (reviewUrl) => {
            if (!reviewUrl || reviewUrl.trim() === '') {
              Alert.alert('Error', 'Please provide a valid review URL')
              return
            }

            try {
              // Process and verify the external review
              const result = await processExternalReview({
                customerId,
                providerId,
                listingId: listingId || null,
                bookingId: bookingId || null,
                platform,
                reviewUrl: reviewUrl.trim(),
              })

              if (result.verified && result.incentiveGranted) {
                Alert.alert(
                  'Review Verified! 🎉',
                  `Thank you for your review! Your discount code is: ${result.couponCode}\n\nYou can use this code on your next booking.`,
                  [{ text: 'OK', onPress: () => onReviewSubmitted?.(platform, result.couponCode) }]
                )
              } else if (result.verified) {
                Alert.alert(
                  'Review Verified',
                  'Your review has been verified. However, it does not meet the requirements for an incentive.',
                  [{ text: 'OK', onPress: () => onReviewSubmitted?.(platform) }]
                )
              } else {
                Alert.alert(
                  'Verification Pending',
                  result.error || 'Your review is being verified. You will receive your discount code once verification is complete.',
                  [{ text: 'OK', onPress: () => onReviewSubmitted?.(platform) }]
                )
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to verify review')
            }
          },
        },
      ],
      'plain-text',
      defaultUrl
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leave a Review</Text>
      {incentiveSettings.incentive_message && (
        <Text style={styles.message}>{incentiveSettings.incentive_message}</Text>
      )}

      <View style={styles.platformsContainer}>
        {platforms.includes('in_app') && (
          <Pressable
            style={styles.platformButton}
            onPress={() => handlePlatformReview('in_app')}
          >
            <Ionicons name="phone-portrait" size={24} color="#f25842" />
            <Text style={styles.platformButtonText}>Review in App</Text>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </Pressable>
        )}

        {platforms.includes('facebook') && incentiveSettings.facebook_page_url && (
          <Pressable
            style={styles.platformButton}
            onPress={() => handlePlatformReview('facebook')}
          >
            <Ionicons name="logo-facebook" size={24} color="#1877f2" />
            <Text style={styles.platformButtonText}>Review on Facebook</Text>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </Pressable>
        )}

        {platforms.includes('google') && incentiveSettings.google_business_url && (
          <Pressable
            style={styles.platformButton}
            onPress={() => handlePlatformReview('google')}
          >
            <Ionicons name="logo-google" size={24} color="#4285f4" />
            <Text style={styles.platformButtonText}>Review on Google</Text>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  platformsContainer: {
    gap: 12,
  },
  platformButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  platformButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
})

