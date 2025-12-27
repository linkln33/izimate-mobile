import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '@/lib/supabase'
import type { User } from '@/lib/types'
import { getUserCurrency, formatCurrency, type CurrencyCode } from '@/lib/utils/currency'
import { getExchangeRates, convertPriceSync } from '@/lib/utils/exchange-rates'
import { pastelDesignSystem } from '@/lib/pastel-design-system'
import { Platform } from 'react-native'
const { colors: pastelColors, surfaces, elevation, spacing, borderRadius } = pastelDesignSystem

interface Props {
  user: User | null
}

interface Subscription {
  plan: 'free' | 'pro' | 'business'
  status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  current_period_end?: string
  cancel_at_period_end?: boolean
}

// Base prices in GBP
const FREE_PLAN_PRICE_GBP = 0.00
const PRO_PLAN_PRICE_GBP = 9.95
const BUSINESS_PLAN_PRICE_GBP = 29.95

export function BillingTab({ user }: Props) {
  const { t } = useTranslation()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [userCurrency, setUserCurrency] = useState<CurrencyCode>('GBP')
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null)

  // Get user's currency preference
  const getUserCurrencyPreference = async () => {
    if (!user?.id) return
    
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('currency, country')
        .eq('id', user.id)
        .single()

      if (userData) {
        const currency = getUserCurrency(userData.currency, userData.country)
        setUserCurrency(currency)
      }
    } catch (error) {
      console.error('Error loading user currency:', error)
    }
  }

  useEffect(() => {
    loadSubscription()
    getUserCurrencyPreference()
    loadExchangeRates()
  }, [user?.id])

  const loadExchangeRates = async () => {
    try {
      const rates = await getExchangeRates()
      setExchangeRates(rates)
    } catch (error) {
      console.error('Error loading exchange rates:', error)
      // Will use default rates from utility if API fails
      const rates = await getExchangeRates()
      setExchangeRates(rates)
    }
  }

  // Reload currency and subscription when screen comes into focus (e.g., after payment)
  useFocusEffect(
    React.useCallback(() => {
      getUserCurrencyPreference()
      loadSubscription()
    }, [user?.id])
  )

  const loadSubscription = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      // Try to load from subscriptions table first
      const { data: subscriptionData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (!subError && subscriptionData) {
        setSubscription({
          plan: subscriptionData.plan_type as 'free' | 'pro' | 'business',
          status: subscriptionData.status,
          current_period_end: subscriptionData.current_period_end,
          cancel_at_period_end: subscriptionData.cancel_at_period_end,
        })
        setLoading(false)
        return
      }

      // Fallback: Check user's verification_status for plan tier
      // Pro users have verification_status = 'pro'
      if (user.verification_status === 'pro') {
        setSubscription({ plan: 'pro', status: 'active' })
      } else if (user.verification_status === 'verified') {
        // Could be business, but defaulting to free for now
        setSubscription({ plan: 'free', status: 'active' })
      } else {
        setSubscription({ plan: 'free', status: 'active' })
      }
    } catch (error) {
      console.error('Failed to load subscription:', error)
      // Default to free plan on error
      setSubscription({ plan: 'free', status: 'active' })
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (plan: 'pro' | 'business') => {
    const API_URL = process.env.EXPO_PUBLIC_SITE_URL || 'https://izimate.com'
    
    try {
      const response = await fetch(`${API_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan,
          userId: user?.id,
        }),
      })

      const data = await response.json()

      if (response.ok && data.url) {
        // Use WebBrowser for better in-app experience
        const result = await WebBrowser.openBrowserAsync(data.url, {
          showTitle: true,
          enableBarCollapsing: false,
          showInRecents: true,
        })

        // Check if user completed payment (result.type === 'cancel' means they closed, 'dismiss' might mean completed)
        // The backend webhook will handle subscription activation
        // Reload subscription after a short delay to check if it was activated
        if (result.type !== 'cancel') {
          // Process affiliate conversion if user was referred (industry standard: process immediately after subscription)
          if (user?.id) {
            try {
              const { processAffiliateConversion } = await import('@/lib/utils/affiliate-tracking')
              // Process conversion - backend will check if user has referral code
              await processAffiliateConversion(user.id, plan)
              // Note: Errors are handled inside processAffiliateConversion, won't block subscription
            } catch (error) {
              console.error('Error processing affiliate conversion:', error)
            }
          }
          
          // Wait a moment for webhook to process subscription activation
          setTimeout(() => {
            loadSubscription()
          }, 2000)
        }
      } else {
        // Handle identity verification requirement
        if (data.requiresVerification) {
          Alert.alert(
            'Verification Required',
            data.message || 'Identity verification is required for premium plans. Please complete verification in your profile before subscribing.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Go to Verification', 
                onPress: () => {
                  // Navigate to verification screen if available
                  // This would need to be implemented based on your navigation structure
                }
              }
            ]
          )
        } else {
          Alert.alert('Error', data.error || 'Failed to start checkout')
        }
      }
    } catch (error) {
      console.error('Checkout error:', error)
      Alert.alert('Error', 'Failed to start checkout. Please check your connection and try again.')
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={pastelColors.primary[500]} />
      </View>
    )
  }

  const currentPlan = subscription?.plan || 'free'

  // Convert prices to user's currency using real-time exchange rates
  // Use default rates if exchange rates haven't loaded yet
  const rates = exchangeRates || { GBP: 1.0 }
  const freePrice = convertPriceSync(FREE_PLAN_PRICE_GBP, userCurrency, rates)
  const proPrice = convertPriceSync(PRO_PLAN_PRICE_GBP, userCurrency, rates)
  const businessPrice = convertPriceSync(BUSINESS_PLAN_PRICE_GBP, userCurrency, rates)

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('dashboard.membershipBilling')}</Text>

      <View style={styles.plansContainer}>
        {/* Free Plan */}
        <View style={[styles.planCard, styles.freePlanCard, currentPlan === 'free' && styles.freePlanCardActive]}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>{t('dashboard.freePlan')}</Text>
            <Text style={[styles.planPrice, styles.freePlanPrice]}>
              {formatCurrency(freePrice, userCurrency)}
              <Text style={styles.planPeriod}>{t('dashboard.month')}</Text>
            </Text>
          </View>
          <View style={styles.planFeatures}>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>{t('dashboard.freePlanFeatures.purchaseBookHire')}</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>{t('dashboard.freePlanFeatures.createListings')}</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>{t('dashboard.freePlanFeatures.businessCalendar')}</Text>
            </View>
          </View>
          {currentPlan === 'free' && (
            <View style={styles.freeCurrentBadge}>
              <Text style={styles.freeCurrentBadgeText}>{t('dashboard.currentPlan')}</Text>
            </View>
          )}
        </View>

        {/* Pro Plan */}
        <View style={[styles.planCard, styles.proPlanCard, currentPlan === 'pro' && styles.proPlanCardActive]}>
          <View style={styles.planHeader}>
            <View style={styles.planHeaderTop}>
              <Text style={styles.planName}>{t('dashboard.proPlan')}</Text>
              {currentPlan !== 'pro' && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedBadgeText}>{t('dashboard.recommended')}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.planPrice, styles.proPlanPrice]}>
              {formatCurrency(proPrice, userCurrency)}
              <Text style={styles.planPeriod}>{t('dashboard.month')}</Text>
            </Text>
          </View>
          <View style={styles.planFeatures}>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>{t('dashboard.proPlanFeatures.allFreeFeatures')}</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>{t('dashboard.proPlanFeatures.createListings')}</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>{t('dashboard.proPlanFeatures.affiliateEarnings')}</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>{t('dashboard.proPlanFeatures.verifyBusiness')}</Text>
            </View>
          </View>
          {currentPlan !== 'pro' && (
            <Pressable
              style={styles.upgradeButton}
              onPress={() => handleUpgrade('pro')}
            >
              <Text style={styles.upgradeButtonText}>{t('dashboard.upgradeToPro')}</Text>
            </Pressable>
          )}
          {currentPlan === 'pro' && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>{t('dashboard.currentPlan')}</Text>
            </View>
          )}
        </View>

        {/* Business Plan */}
        <View style={[styles.planCard, styles.businessPlanCard, currentPlan === 'business' && styles.businessPlanCardActive]}>
          <View style={styles.planHeader}>
            <View style={styles.planHeaderTop}>
              <Text style={styles.planName}>{t('dashboard.businessPlan')}</Text>
              <View style={styles.verifiedBusinessBadge}>
                <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.verifiedBusinessBadgeText}>{t('dashboard.verifiedBusiness')}</Text>
              </View>
            </View>
            <Text style={[styles.planPrice, styles.businessPlanPrice]}>
              {formatCurrency(businessPrice, userCurrency)}
              <Text style={styles.planPeriod}>{t('dashboard.month')}</Text>
            </Text>
          </View>
          <View style={styles.planFeatures}>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>{t('dashboard.businessPlanFeatures.unlimitedListings')}</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>{t('dashboard.businessPlanFeatures.support')}</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>{t('dashboard.businessPlanFeatures.customDomain')}</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>{t('dashboard.businessPlanFeatures.prioritySearch')}</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>{t('dashboard.businessPlanFeatures.businessBadge')}</Text>
            </View>
          </View>
          {currentPlan !== 'business' && (
            <Pressable
              style={styles.businessUpgradeButton}
              onPress={() => handleUpgrade('business')}
            >
              <Text style={styles.businessUpgradeButtonText}>{t('dashboard.upgradeToBusiness')}</Text>
            </Pressable>
          )}
          {currentPlan === 'business' && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>{t('dashboard.currentPlan')}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: surfaces.onSurface,
    padding: spacing.xl,
    backgroundColor: 'transparent',
  },
  plansContainer: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  planCard: {
    backgroundColor: pastelColors.primary[100], // Light teal #E0FBFB
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...elevation.level2,
  },
  planCardActive: {
    ...elevation.level3,
  },
  freePlanCard: {
    backgroundColor: pastelColors.sand[50], // Light yellow/sand background for Free
  },
  freePlanCardActive: {
    ...elevation.level3,
  },
  freePlanPrice: {
    color: surfaces.onSurface,
  },
  proPlanCard: {
    backgroundColor: pastelColors.primary[100], // Light cyan background for Pro
  },
  proPlanCardActive: {
    // No special styling needed
  },
  proPlanPrice: {
    color: surfaces.onSurface,
  },
  businessPlanCard: {
    backgroundColor: pastelColors.secondary[100], // Light pink background for Business
  },
  businessPlanCardActive: {
    ...elevation.level3,
  },
  businessPlanPrice: {
    color: surfaces.onSurface,
  },
  planHeader: {
    marginBottom: spacing.xl,
  },
  planHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: surfaces.onSurface,
  },
  recommendedBadge: {
    backgroundColor: pastelColors.secondary[500], // Pink #FF6B8A
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    ...elevation.level1,
  },
  recommendedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  verifiedBusinessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9333EA', // Purple
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    ...elevation.level1,
  },
  verifiedBusinessBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: pastelColors.primary[500],
  },
  planPeriod: {
    fontSize: 16,
    fontWeight: 'normal',
    color: surfaces.onSurfaceVariant,
  },
  planFeatures: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureText: {
    fontSize: 14,
    color: surfaces.onSurface,
  },
  upgradeButton: {
    backgroundColor: pastelColors.primary[400], // Slightly darker teal #8FEFEB for better contrast
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    ...elevation.level1,
  },
  upgradeButtonText: {
    color: pastelColors.primary[900], // Very dark teal #156660 for better contrast
    fontSize: 16,
    fontWeight: '600',
  },
  businessUpgradeButton: {
    backgroundColor: pastelColors.secondary[500], // Pink #FF6B8A
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    ...elevation.level1,
  },
  businessUpgradeButtonText: {
    color: pastelColors.secondary[900], // Very dark pink #B31E2E for better contrast
    fontSize: 16,
    fontWeight: '600',
  },
  freeCurrentBadge: {
    backgroundColor: pastelColors.sand[400], // Darker yellow #FFE5B4
    borderRadius: borderRadius.md, // Match upgrade buttons
    padding: spacing.lg, // Match upgrade buttons
    alignItems: 'center',
    ...elevation.level1, // Match upgrade buttons
  },
  freeCurrentBadgeText: {
    color: pastelColors.neutral[900], // Dark text for contrast
    fontSize: 16, // Match upgrade buttons
    fontWeight: '600',
  },
  currentBadge: {
    backgroundColor: pastelColors.success[100],
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    alignItems: 'center',
    ...elevation.level1,
  },
  currentBadgeText: {
    color: pastelColors.success[600],
    fontSize: 14,
    fontWeight: '600',
  },
})
