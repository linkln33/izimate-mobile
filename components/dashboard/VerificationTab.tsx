import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { User } from '@/lib/types'
import { pastelDesignSystem } from '@/lib/pastel-design-system'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { getDiditConfig, createDiditIdentityVerification } from '@/lib/utils/didit-verification'
const { colors: pastelColors, surfaces, elevation, spacing, borderRadius } = pastelDesignSystem

// Cloudflare Worker URL for verification (only needed for web browsers due to CORS)
// Native apps (iOS/Android) work fine with direct API calls - no worker needed
// Set EXPO_PUBLIC_VERIFICATION_WORKER_URL in your .env file ONLY if you need web browser support
const VERIFICATION_WORKER_URL = 
  process.env.EXPO_PUBLIC_VERIFICATION_WORKER_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_VERIFICATION_WORKER_URL ||
  undefined

const isWorkerConfigured = VERIFICATION_WORKER_URL && 
  VERIFICATION_WORKER_URL.length > 0 && 
  !VERIFICATION_WORKER_URL.includes('your-domain') &&
  VERIFICATION_WORKER_URL.startsWith('http')

interface Props {
  user: User | null
}

export function VerificationTab({ user }: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const [subscription, setSubscription] = useState<{ plan: 'free' | 'pro' | 'business' } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSubscription()
  }, [user?.id])

  const loadSubscription = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      // Check subscription from subscriptions table
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('plan_type')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (subscriptionData) {
        setSubscription({ plan: subscriptionData.plan_type as 'free' | 'pro' | 'business' })
      } else if (user.verification_status === 'pro') {
        // Fallback: check user's verification_status
        setSubscription({ plan: 'pro' })
      } else {
        setSubscription({ plan: 'free' })
      }
    } catch (error) {
      // Default to free if no subscription found
      setSubscription({ plan: 'free' })
    } finally {
      setLoading(false)
    }
  }

  const handleIdentityVerification = async () => {
    if (!user?.id) {
      Alert.alert(t('verification.error'), t('verification.userNotFound'))
      return
    }

    const isWeb = Platform.OS === 'web'

    // On web without worker configured, show message immediately (don't try direct call - will always fail with CORS)
    if (isWeb && !isWorkerConfigured) {
      // Alert.alert doesn't work in web browsers, use window.alert for web
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(
          `${t('verification.webBrowserLimitation')}\n\n${t('verification.verificationNotAvailableWeb')}\n\n${t('verification.verificationWorksMobile')}\n\n${t('verification.enableWebSupport')}`
        )
      } else {
        Alert.alert(
          t('verification.webBrowserLimitation'),
          `${t('verification.verificationNotAvailableWeb')}\n\n${t('verification.verificationWorksMobile')}\n\n${t('verification.enableWebSupport')}`,
          [
            {
              text: 'OK'
            }
          ]
        )
      }
      return
    }

    try {
      let sessionData: { session_id: string; verification_url: string }

      if (isWeb && isWorkerConfigured) {
        // On web with configured worker, use Cloudflare Worker to avoid CORS
        try {
          const workerResponse = await fetch(VERIFICATION_WORKER_URL!, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'identity',
              user_id: user.id,
            }),
          })

          if (!workerResponse.ok) {
            const errorData = await workerResponse.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to create verification session')
          }

          sessionData = await workerResponse.json()
        } catch (workerError: any) {
          console.error('Worker error:', workerError)
          Alert.alert(
            'Verification Error',
            'Failed to start verification. Please ensure the verification worker is deployed and accessible.'
          )
          return
        }
      } else {
        // On native (iOS/Android): direct API call works perfectly (no CORS restrictions)
        const didItConfig = getDiditConfig()
        if (!didItConfig.apiKey) {
          Alert.alert('Configuration Error', 'Didit API key not configured')
          return
        }

        const session = await createDiditIdentityVerification(user.id, didItConfig)
        sessionData = {
          session_id: session.sessionId,
          verification_url: session.verificationUrl,
        }
      }

      // Store session info in database
      await supabase
        .from('verification_sessions')
        .insert({
          user_id: user.id,
          session_id: sessionData.session_id,
          type: 'identity',
          status: 'pending',
          verification_url: sessionData.verification_url
        })

      // Open Didit verification flow
      await Linking.openURL(sessionData.verification_url)
      
    } catch (error: any) {
      console.error('Didit verification error:', error)
      Alert.alert(t('verification.error'), error.message || t('verification.failedToStartVerification'))
    }
  }

  const handleBusinessVerification = async () => {
    if (!user?.id) {
      Alert.alert(t('verification.error'), t('verification.userNotFound'))
      return
    }

    // Check if user has Pro or Business plan
    const hasProOrBusiness = subscription?.plan === 'pro' || subscription?.plan === 'business'
    if (!hasProOrBusiness) {
      Alert.alert(
        t('verification.error'),
        'Business verification is available for Pro and Business plan subscribers. Please upgrade your plan first.'
      )
      return
    }

    const isWeb = Platform.OS === 'web'

    // On web without worker configured, show message immediately (don't try direct call - will always fail with CORS)
    if (isWeb && !isWorkerConfigured) {
      // Alert.alert doesn't work in web browsers, use window.alert for web
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(
          `${t('verification.webBrowserLimitation')}\n\n${t('verification.verificationNotAvailableWeb')}\n\n${t('verification.verificationWorksMobile')}\n\n${t('verification.enableWebSupport')}`
        )
      } else {
        Alert.alert(
          t('verification.webBrowserLimitation'),
          `${t('verification.verificationNotAvailableWeb')}\n\n${t('verification.verificationWorksMobile')}\n\n${t('verification.enableWebSupport')}`
        )
      }
      return
    }

    try {
      let sessionData: { session_id: string; verification_url: string }

      // Use user's name and location for business verification
      const businessData = {
        companyName: user.name || '',
        registrationNumber: '', // Can be added later if needed
        country: user.country || 'GB',
        address: user.location_address || '',
      }

      if (isWeb && isWorkerConfigured) {
        // On web with configured worker, use Cloudflare Worker to avoid CORS
        try {
          const workerResponse = await fetch(VERIFICATION_WORKER_URL!, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'business',
              user_id: user.id,
              business_data: businessData,
            }),
          })

          if (!workerResponse.ok) {
            const errorData = await workerResponse.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to create verification session')
          }

          sessionData = await workerResponse.json()
        } catch (workerError: any) {
          console.error('Worker error:', workerError)
          Alert.alert(
            'Verification Error',
            'Failed to start verification. Please ensure the verification worker is deployed and accessible.'
          )
          return
        }
      } else {
        // On native (iOS/Android), direct API call works fine (no CORS)
        const didItConfig = getDiditConfig()
        if (!didItConfig.apiKey) {
          Alert.alert('Configuration Error', 'Didit API key not configured')
          return
        }

        const { createDiditBusinessVerification } = await import('@/lib/utils/didit-verification')
        const session = await createDiditBusinessVerification(user.id, businessData, didItConfig)
        sessionData = {
          session_id: session.sessionId,
          verification_url: session.verificationUrl,
        }
      }

      // Store session info in database
      await supabase
        .from('verification_sessions')
        .insert({
          user_id: user.id,
          session_id: sessionData.session_id,
          type: 'business',
          status: 'pending',
          verification_url: sessionData.verification_url
        })

      // Open Didit verification flow
      await Linking.openURL(sessionData.verification_url)
      
    } catch (error: any) {
      console.error('Business verification error:', error)
      Alert.alert(t('verification.error'), error.message || t('verification.failedToStartBusinessVerification'))
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={pastelColors.primary[500]} />
      </View>
    )
  }

  const identityVerified = user?.identity_verified || false
  const identityStatus = user?.identity_verification_status || 'pending'
  const businessVerified = user?.business_verified || false
  const hasProOrBusiness = subscription?.plan === 'pro' || subscription?.plan === 'business'

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>{t('verification.verificationCenter')}</Text>

      {/* Identity Verification */}
      <View style={styles.verificationCard}>
        <View style={styles.verificationHeader}>
          <View style={styles.verificationHeaderLeft}>
            <Ionicons
              name={identityVerified ? 'checkmark-circle' : 'person-outline'}
              size={32}
              color={identityVerified ? pastelColors.success[500] : surfaces.onSurfaceVariant}
            />
            <View style={styles.verificationHeaderText}>
              <Text style={styles.verificationTitle}>{t('verification.identityVerification')}</Text>
              <Text style={styles.verificationSubtitle}>
                {t('verification.identityVerificationDesc')}
              </Text>
            </View>
          </View>
          {identityVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>{t('verification.verified')}</Text>
            </View>
          )}
        </View>

        {identityStatus === 'pending' && (
          <Pressable
            style={({ pressed }) => [
              styles.verifyButton,
              pressed && { opacity: 0.7 }
            ]}
            onPress={handleIdentityVerification}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
          >
            <Text style={styles.verifyButtonText}>{t('verification.startVerification')}</Text>
          </Pressable>
        )}

        {identityStatus === 'processing' && (
          <View style={styles.statusInfo}>
            <ActivityIndicator size="small" color={pastelColors.warning[500]} />
            <Text style={styles.statusText}>{t('verification.verificationInProgress')}</Text>
          </View>
        )}

        {identityStatus === 'verified' && (
          <View style={styles.statusInfo}>
            <Ionicons name="checkmark-circle" size={20} color={pastelColors.success[500]} />
            <Text style={styles.statusText}>{t('verification.identityVerified')}</Text>
          </View>
        )}

        {(identityStatus === 'failed' || identityStatus === 'rejected') && (
          <View style={styles.statusInfo}>
            <Ionicons name="close-circle" size={20} color={pastelColors.error[500]} />
            <Text style={styles.statusText}>
              {identityStatus === 'failed' ? t('verification.verificationFailed') : t('verification.verificationRejected')}
            </Text>
          </View>
        )}
      </View>

      {/* Business Verification */}
      <View style={[styles.verificationCard, styles.businessVerificationCard]}>
        <View style={styles.verificationHeader}>
          <View style={styles.verificationHeaderLeft}>
            <Ionicons
              name={businessVerified ? 'checkmark-circle' : 'business-outline'}
              size={32}
              color={businessVerified ? pastelColors.success[500] : surfaces.onSurfaceVariant}
            />
            <View style={styles.verificationHeaderText}>
              <Text style={styles.verificationTitle}>{t('verification.businessVerification')}</Text>
              <Text style={styles.verificationSubtitle}>
                {t('verification.businessVerificationDesc')}
              </Text>
            </View>
          </View>
          {businessVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>{t('verification.verified')}</Text>
            </View>
          )}
        </View>

        {!hasProOrBusiness && !businessVerified && (
          <Pressable
            style={styles.businessVerifyButton}
            onPress={() => {
              // Update URL params to expand billing section
              router.setParams({ section: 'billing' })
              // Scroll to billing section after a short delay
              setTimeout(() => {
                // The billing section should expand automatically via defaultExpanded prop
              }, 100)
            }}
          >
            <Text style={styles.businessVerifyButtonText}>Verify as Business</Text>
          </Pressable>
        )}

        {hasProOrBusiness && !businessVerified && (
          <Pressable
            style={styles.businessVerifyButton}
            onPress={handleBusinessVerification}
          >
            <Text style={styles.businessVerifyButtonText}>{t('verification.verifyBusiness')}</Text>
          </Pressable>
        )}

        {businessVerified && (
          <View style={styles.statusInfo}>
            <Ionicons name="checkmark-circle" size={20} color={pastelColors.success[500]} />
            <Text style={styles.statusText}>{t('verification.businessVerified')}</Text>
          </View>
        )}
      </View>

      {/* Verification Score */}
      {hasProOrBusiness && (
        <View style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>{t('verification.verificationScore')}</Text>
          <Text style={styles.scoreValue}>{user?.verification_score || 0}/100</Text>
          <View style={styles.scoreBar}>
            <View
              style={[
                styles.scoreBarFill,
                { width: `${user?.verification_score || 0}%` },
              ]}
            />
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: surfaces.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: surfaces.onSurface,
    marginBottom: spacing.xl,
  },
  verificationCard: {
    backgroundColor: surfaces.surface, // Match overview cards
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...elevation.level2,
  },
  verificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  verificationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  verificationHeaderText: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: surfaces.onSurface,
    marginBottom: spacing.xs,
  },
  verificationSubtitle: {
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
  },
  verifiedBadge: {
    backgroundColor: pastelColors.success[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    ...elevation.level1,
  },
  verifiedBadgeText: {
    color: pastelColors.success[600],
    fontSize: 12,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: pastelColors.primary[400], // Light teal #8FEFEB
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // Ensure button is tappable
    ...elevation.level1,
  },
  verifyButtonText: {
    color: '#000000', // Black text for consistency
    fontSize: 16,
    fontWeight: '600',
  },
  businessVerificationCard: {
    backgroundColor: pastelColors.secondary[100], // Light pink - match Business Plan
  },
  businessVerifyButton: {
    backgroundColor: pastelColors.secondary[500], // Pink #FF6B8A - match Business Plan button
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.level1,
  },
  businessVerifyButtonText: {
    color: '#000000', // Black text for consistency
    fontSize: 16,
    fontWeight: '600',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
  },
  infoText: {
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
    fontStyle: 'italic',
  },
  scoreCard: {
    backgroundColor: surfaces.surface, // Match overview cards
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginTop: spacing.sm,
    ...elevation.level2,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: surfaces.onSurface,
    marginBottom: spacing.sm,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: pastelColors.primary[500],
    marginBottom: spacing.md,
  },
  scoreBar: {
    height: 8,
    backgroundColor: surfaces.surfaceVariant,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    backgroundColor: pastelColors.primary[500],
  },
})
