import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { User } from '@/lib/types'
import { getUserCurrency, formatCurrency, type CurrencyCode } from '@/lib/utils/currency'
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
const PRO_PLAN_PRICE_GBP = 4.95
const BUSINESS_PLAN_PRICE_GBP = 19.95

// Simple exchange rates (approximate, should be updated from API in production)
const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  GBP: 1.0,
  USD: 1.27,
  EUR: 1.17,
  CAD: 1.72,
  AUD: 1.94,
  JPY: 188.0,
  CHF: 1.10,
  CNY: 9.15,
  INR: 105.0,
  BRL: 6.30,
  MXN: 21.50,
  ZAR: 23.50,
  NZD: 2.08,
  SGD: 1.70,
  HKD: 9.90,
  NOK: 13.50,
  SEK: 13.20,
  DKK: 8.70,
  PLN: 5.05,
  CZK: 29.0,
}

function convertPrice(priceGBP: number, targetCurrency: CurrencyCode): number {
  const rate = EXCHANGE_RATES[targetCurrency] || 1.0
  return priceGBP * rate
}

export function BillingTab({ user }: Props) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [userCurrency, setUserCurrency] = useState<CurrencyCode>('GBP')

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
  }, [user?.id])

  // Reload currency when screen comes into focus (e.g., after currency change)
  useFocusEffect(
    React.useCallback(() => {
      getUserCurrencyPreference()
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
        Linking.openURL(data.url)
      } else {
        Alert.alert('Error', data.error || 'Failed to start checkout')
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start checkout')
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

  // Convert prices to user's currency
  const proPrice = convertPrice(PRO_PLAN_PRICE_GBP, userCurrency)
  const businessPrice = convertPrice(BUSINESS_PLAN_PRICE_GBP, userCurrency)

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Membership & Billing</Text>

      <View style={styles.currentPlan}>
        <Text style={styles.currentPlanLabel}>Current Plan</Text>
        <Text style={styles.currentPlanName}>
          {currentPlan === 'pro' ? 'Pro Plan' : currentPlan === 'business' ? 'Business Plan' : 'Free Plan'}
        </Text>
      </View>

      <View style={styles.plansContainer}>
        {/* Pro Plan */}
        <View style={[styles.planCard, styles.proPlanCard, currentPlan === 'pro' && styles.proPlanCardActive]}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Pro Plan</Text>
            <Text style={[styles.planPrice, styles.proPlanPrice]}>
              {formatCurrency(proPrice, userCurrency)}
              <Text style={styles.planPeriod}>/month</Text>
            </Text>
          </View>
          <View style={styles.planFeatures}>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>10 listings per month</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>Priority support</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>Advanced search filters</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>Analytics dashboard</Text>
            </View>
          </View>
          {currentPlan !== 'pro' && (
            <Pressable
              style={styles.upgradeButton}
              onPress={() => handleUpgrade('pro')}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
            </Pressable>
          )}
          {currentPlan === 'pro' && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Current Plan</Text>
            </View>
          )}
        </View>

        {/* Business Plan */}
        <View style={[styles.planCard, styles.businessPlanCard, currentPlan === 'business' && styles.businessPlanCardActive]}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Business Plan</Text>
            <Text style={[styles.planPrice, styles.businessPlanPrice]}>
              {formatCurrency(businessPrice, userCurrency)}
              <Text style={styles.planPeriod}>/month</Text>
            </Text>
          </View>
          <View style={styles.planFeatures}>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>Unlimited listings</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>24/7 priority support</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>All Pro features</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>Custom branding</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color={pastelColors.success[500]} />
              <Text style={styles.featureText}>API access</Text>
            </View>
          </View>
          {currentPlan !== 'business' && (
            <Pressable
              style={styles.businessUpgradeButton}
              onPress={() => handleUpgrade('business')}
            >
              <Text style={styles.businessUpgradeButtonText}>Upgrade to Business</Text>
            </Pressable>
          )}
          {currentPlan === 'business' && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Current Plan</Text>
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
  currentPlan: {
    backgroundColor: pastelColors.primary[100], // Light teal #E0FBFB
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...elevation.level2,
  },
  currentPlanLabel: {
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  currentPlanName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: surfaces.onSurface,
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
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: surfaces.onSurface,
    marginBottom: spacing.sm,
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
