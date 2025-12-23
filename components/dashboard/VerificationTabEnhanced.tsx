import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { createDiditIdentityVerification, createDiditBusinessVerification, calculateVerificationScore, getDiditConfig } from '@/lib/utils/didit-verification'
import type { User, ProviderProfile } from '@/lib/types'

interface Props {
  user: User | null
}

export function VerificationTabEnhanced({ user }: Props) {
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [verificationLoading, setVerificationLoading] = useState(false)

  // Didit configuration
  const didItConfig = getDiditConfig()

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

  const handleDiditIdentityVerification = async () => {
    if (!user?.id || !didItConfig.apiKey) {
      Alert.alert('Configuration Error', 'Didit API key not configured')
      return
    }

    setVerificationLoading(true)

    try {
      // Create Didit verification session
      const session = await createDiditIdentityVerification(user.id, didItConfig)
      
      // Store session ID in database for webhook handling
      await supabase
        .from('verification_sessions')
        .insert({
          user_id: user.id,
          session_id: session.sessionId,
          type: 'identity',
          status: 'pending',
          verification_url: session.verificationUrl
        })

      // Open Didit verification flow
      await Linking.openURL(session.verificationUrl)
      
    } catch (error: any) {
      console.error('Didit verification error:', error)
      Alert.alert('Error', error.message || 'Failed to start verification')
    } finally {
      setVerificationLoading(false)
    }
  }

  const handleDiditBusinessVerification = async () => {
    if (!user?.id || !providerProfile) {
      Alert.alert('Error', 'Provider profile required for business verification')
      return
    }

    if (!didItConfig.apiKey) {
      Alert.alert('Configuration Error', 'Didit API key not configured')
      return
    }

    setVerificationLoading(true)

    try {
      const businessData = {
        companyName: providerProfile.business_name || '',
        registrationNumber: providerProfile.business_registration_number || '',
        country: 'GB', // Default to UK, make configurable
        address: providerProfile.business_address || ''
      }

      const session = await createDiditBusinessVerification(user.id, businessData, didItConfig)
      
      // Store session ID for webhook handling
      await supabase
        .from('verification_sessions')
        .insert({
          user_id: user.id,
          session_id: session.sessionId,
          type: 'business',
          status: 'pending',
          verification_url: session.verificationUrl
        })

      await Linking.openURL(session.verificationUrl)
      
    } catch (error: any) {
      console.error('Business verification error:', error)
      Alert.alert('Error', error.message || 'Failed to start business verification')
    } finally {
      setVerificationLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f25842" />
      </View>
    )
  }

  const identityVerified = user?.identity_verified || false
  const identityStatus = user?.identity_verification_status || 'pending'
  const businessVerified = providerProfile?.business_verified || false
  
  // Calculate overall verification score
  const verificationScore = calculateVerificationScore(
    identityVerified ? { status: 'verified' } as any : undefined,
    businessVerified ? { status: 'verified' } as any : undefined
  )

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Verification Center</Text>
      <Text style={styles.subtitle}>Powered by Didit AI Verification</Text>

      {/* Didit Features Banner */}
      <View style={styles.featureBanner}>
        <View style={styles.featureRow}>
          <Ionicons name="shield-checkmark" size={16} color="#10b981" />
          <Text style={styles.featureText}>AI-powered document verification</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="eye" size={16} color="#10b981" />
          <Text style={styles.featureText}>Liveness detection</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="business" size={16} color="#10b981" />
          <Text style={styles.featureText}>Companies House integration</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="search" size={16} color="#10b981" />
          <Text style={styles.featureText}>AML screening</Text>
        </View>
      </View>

      {/* Identity Verification */}
      <View style={styles.verificationCard}>
        <View style={styles.verificationHeader}>
          <View style={styles.verificationHeaderLeft}>
            <Ionicons
              name={identityVerified ? 'checkmark-circle' : 'person-outline'}
              size={32}
              color={identityVerified ? '#10b981' : '#6b7280'}
            />
            <View style={styles.verificationHeaderText}>
              <Text style={styles.verificationTitle}>Identity Verification</Text>
              <Text style={styles.verificationSubtitle}>
                AI-powered ID verification with liveness detection
              </Text>
              <View style={styles.includedFeatures}>
                <Text style={styles.includedText}>✓ Document verification (220+ countries)</Text>
                <Text style={styles.includedText}>✓ Face matching & liveness</Text>
                <Text style={styles.includedText}>✓ AML screening</Text>
              </View>
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
            style={[styles.verifyButton, verificationLoading && styles.disabledButton]}
            onPress={handleDiditIdentityVerification}
            disabled={verificationLoading}
          >
            {verificationLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.verifyButtonText}>Start Identity Verification</Text>
            )}
          </Pressable>
        )}

        {identityStatus === 'processing' && (
          <View style={styles.statusInfo}>
            <ActivityIndicator size="small" color="#fbbf24" />
            <Text style={styles.statusText}>AI verification in progress...</Text>
          </View>
        )}

        {identityStatus === 'verified' && (
          <View style={styles.statusInfo}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.statusText}>Identity verified by Didit AI</Text>
          </View>
        )}

        {(identityStatus === 'failed' || identityStatus === 'rejected') && (
          <View style={styles.statusInfo}>
            <Ionicons name="close-circle" size={20} color="#ef4444" />
            <Text style={styles.statusText}>Verification {identityStatus}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={handleDiditIdentityVerification}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
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
              color={businessVerified ? '#10b981' : '#6b7280'}
            />
            <View style={styles.verificationHeaderText}>
              <Text style={styles.verificationTitle}>Business Verification</Text>
              <Text style={styles.verificationSubtitle}>
                Companies House & business registry verification
              </Text>
              <View style={styles.includedFeatures}>
                <Text style={styles.includedText}>✓ Companies House lookup</Text>
                <Text style={styles.includedText}>✓ Business AML screening</Text>
                <Text style={styles.includedText}>✓ Address verification</Text>
              </View>
            </View>
          </View>
          {businessVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
          )}
        </View>

        {!providerProfile && (
          <View style={styles.requirementInfo}>
            <Ionicons name="information-circle" size={20} color="#fbbf24" />
            <Text style={styles.infoText}>
              Set up a provider profile to verify your business
            </Text>
          </View>
        )}

        {providerProfile && !businessVerified && (
          <Pressable
            style={[styles.verifyButton, verificationLoading && styles.disabledButton]}
            onPress={handleDiditBusinessVerification}
            disabled={verificationLoading}
          >
            {verificationLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify Business</Text>
            )}
          </Pressable>
        )}

        {businessVerified && (
          <View style={styles.statusInfo}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.statusText}>Business verified via Companies House</Text>
          </View>
        )}
      </View>

      {/* Enhanced Verification Score */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreHeader}>
          <Text style={styles.scoreTitle}>Trust Score</Text>
          <Text style={styles.scoreSubtitle}>Based on Didit AI verification</Text>
        </View>
        <Text style={styles.scoreValue}>{verificationScore}/100</Text>
        <View style={styles.scoreBar}>
          <View
            style={[
              styles.scoreBarFill,
              { 
                width: `${verificationScore}%`,
                backgroundColor: verificationScore >= 80 ? '#10b981' : verificationScore >= 60 ? '#fbbf24' : '#ef4444'
              },
            ]}
          />
        </View>
        <View style={styles.scoreBreakdown}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreItemLabel}>Identity</Text>
            <Text style={styles.scoreItemValue}>{identityVerified ? '60' : '0'}/60</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreItemLabel}>Business</Text>
            <Text style={styles.scoreItemValue}>{businessVerified ? '40' : '0'}/40</Text>
          </View>
        </View>
      </View>

      {/* Didit Branding */}
      <View style={styles.brandingFooter}>
        <Text style={styles.brandingText}>Verification powered by</Text>
        <Pressable onPress={() => Linking.openURL('https://didit.me')}>
          <Text style={styles.brandingLink}>Didit AI</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  featureBanner: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#166534',
    marginLeft: 8,
    fontWeight: '500',
  },
  verificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: '#1a1a1a',
    marginBottom: 4,
  },
  verificationSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  includedFeatures: {
    gap: 2,
  },
  includedText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  verifiedBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: '#f25842',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
  },
  retryButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  retryButtonText: {
    fontSize: 12,
    color: '#f25842',
    fontWeight: '600',
  },
  requirementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#92400e',
    flex: 1,
  },
  scoreCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  scoreHeader: {
    marginBottom: 12,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  scoreSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f25842',
    marginBottom: 12,
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  scoreBarFill: {
    height: '100%',
  },
  scoreBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreItemLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  scoreItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  brandingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  brandingText: {
    fontSize: 12,
    color: '#6b7280',
  },
  brandingLink: {
    fontSize: 12,
    color: '#f25842',
    fontWeight: '600',
  },
})