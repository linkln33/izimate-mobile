import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import type { User, ProviderProfile } from '@/lib/types'
import { pastelDesignSystem } from '@/lib/pastel-design-system'
import { Platform } from 'react-native'
const { colors: pastelColors, surfaces, elevation, spacing, borderRadius } = pastelDesignSystem

interface Props {
  user: User | null
}

export function VerificationTab({ user }: Props) {
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProviderProfile()
  }, [user?.id])

  const loadProviderProfile = async () => {
    if (!user?.id) return

    try {
      const { data } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setProviderProfile(data)
      }
    } catch (error) {
      // No provider profile yet
    } finally {
      setLoading(false)
    }
  }

  const handleIdentityVerification = async () => {
    if (!user?.id) return

    try {
      // Create Didit verification session directly
      const response = await fetch('https://api.didit.me/v1/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer AsiGVVkU_5tKEwQdR2OkTVjh6Gp3eTicnF6dSW-qQmQ`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow_id: '694ea16c-7c1c-41dc-acdc-a191ac4cf67c',
          user_reference: user.id,
          redirect_url: `https://izimate.com/verification/callback`,
          webhook_url: `https://izimate.com/api/verification/webhook`,
          settings: {
            language: 'en',
            theme: {
              primary_color: '#f25842',
            }
          }
        }),
      })

      const data = await response.json()

      if (response.ok && data.verification_url) {
        // Store session info in database
        await supabase
          .from('verification_sessions')
          .insert({
            user_id: user.id,
            session_id: data.session_id,
            type: 'identity',
            status: 'pending',
            verification_url: data.verification_url
          })

        // Open Didit verification flow
        await Linking.openURL(data.verification_url)
      } else {
        Alert.alert('Error', data.error || 'Failed to start verification')
      }
    } catch (error: any) {
      console.error('Didit verification error:', error)
      Alert.alert('Error', 'Failed to start verification')
    }
  }

  const handleBusinessVerification = async () => {
    Alert.alert('Business Verification', 'Please visit the web app to complete business verification.')
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
  const businessVerified = providerProfile?.business_verified || false

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Verification Center</Text>

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
              <Text style={styles.verificationTitle}>Identity Verification</Text>
              <Text style={styles.verificationSubtitle}>
                Verify your identity with government-issued ID
              </Text>
            </View>
          </View>
          {identityVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
          )}
        </View>

        {identityStatus === 'pending' && (
          <Pressable
            style={styles.verifyButton}
            onPress={handleIdentityVerification}
          >
            <Text style={styles.verifyButtonText}>Start Verification</Text>
          </Pressable>
        )}

        {identityStatus === 'processing' && (
          <View style={styles.statusInfo}>
            <ActivityIndicator size="small" color={pastelColors.warning[500]} />
            <Text style={styles.statusText}>Verification in progress...</Text>
          </View>
        )}

        {identityStatus === 'verified' && (
          <View style={styles.statusInfo}>
            <Ionicons name="checkmark-circle" size={20} color={pastelColors.success[500]} />
            <Text style={styles.statusText}>Identity verified</Text>
          </View>
        )}

        {identityStatus === 'failed' || identityStatus === 'rejected' && (
          <View style={styles.statusInfo}>
            <Ionicons name="close-circle" size={20} color={pastelColors.error[500]} />
            <Text style={styles.statusText}>Verification {identityStatus}</Text>
          </View>
        )}
      </View>

      {/* Business Verification */}
      <View style={styles.verificationCard}>
        <View style={styles.verificationHeader}>
          <View style={styles.verificationHeaderLeft}>
            <Ionicons
              name={businessVerified ? 'checkmark-circle' : 'business-outline'}
              size={32}
              color={businessVerified ? pastelColors.success[500] : surfaces.onSurfaceVariant}
            />
            <View style={styles.verificationHeaderText}>
              <Text style={styles.verificationTitle}>Business Verification</Text>
              <Text style={styles.verificationSubtitle}>
                Verify your UK business registration (Companies House)
              </Text>
            </View>
          </View>
          {businessVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
          )}
        </View>

        {!providerProfile && (
          <Text style={styles.infoText}>
            Set up a provider profile to verify your business
          </Text>
        )}

        {providerProfile && !businessVerified && (
          <Pressable
            style={styles.verifyButton}
            onPress={handleBusinessVerification}
          >
            <Text style={styles.verifyButtonText}>Verify Business</Text>
          </Pressable>
        )}

        {businessVerified && (
          <View style={styles.statusInfo}>
            <Ionicons name="checkmark-circle" size={20} color={pastelColors.success[500]} />
            <Text style={styles.statusText}>Business verified</Text>
          </View>
        )}
      </View>

      {/* Verification Score */}
      {providerProfile && (
        <View style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>Verification Score</Text>
          <Text style={styles.scoreValue}>{providerProfile.verification_score || 0}/100</Text>
          <View style={styles.scoreBar}>
            <View
              style={[
                styles.scoreBarFill,
                { width: `${providerProfile.verification_score || 0}%` },
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
    backgroundColor: pastelColors.primary[100], // Light teal #E0FBFB
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
    backgroundColor: pastelColors.primary[400], // Slightly darker teal for better contrast
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    ...elevation.level1,
  },
  verifyButtonText: {
    color: pastelColors.primary[900], // Very dark teal for better contrast
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
    backgroundColor: pastelColors.primary[100], // Light teal #E0FBFB
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
