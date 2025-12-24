import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { User } from '@/lib/types'

interface Props {
  user: User | null
}

export function BillingTab({ user }: Props) {
  const [subscription, setSubscription] = useState<{ plan: 'free' | 'pro' | 'business'; status: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Load subscription from database/Stripe
    setSubscription({ plan: 'free', status: 'active' })
    setLoading(false)
  }, [user?.id])

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
        <ActivityIndicator size="large" color="#f25842" />
      </View>
    )
  }

  const currentPlan = subscription?.plan || 'free'

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
            <Text style={[styles.planPrice, styles.proPlanPrice]}>£4.95<Text style={styles.planPeriod}>/month</Text></Text>
          </View>
          <View style={styles.planFeatures}>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color="#10b981" />
              <Text style={styles.featureText}>10 listings per month</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color="#10b981" />
              <Text style={styles.featureText}>Priority support</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color="#10b981" />
              <Text style={styles.featureText}>Advanced search filters</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color="#10b981" />
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
            <Text style={[styles.planPrice, styles.businessPlanPrice]}>£19.95<Text style={styles.planPeriod}>/month</Text></Text>
          </View>
          <View style={styles.planFeatures}>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color="#10b981" />
              <Text style={styles.featureText}>Unlimited listings</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color="#10b981" />
              <Text style={styles.featureText}>24/7 priority support</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color="#10b981" />
              <Text style={styles.featureText}>All Pro features</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color="#10b981" />
              <Text style={styles.featureText}>Custom branding</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark" size={20} color="#10b981" />
              <Text style={styles.featureText}>API access</Text>
            </View>
          </View>
          {currentPlan !== 'business' && (
            <Pressable
              style={styles.upgradeButton}
              onPress={() => handleUpgrade('business')}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Business</Text>
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
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  currentPlan: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  currentPlanLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  currentPlanName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  plansContainer: {
    padding: 20,
    gap: 16,
  },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  planCardActive: {
    borderColor: '#f25842',
    backgroundColor: '#fef2f2',
  },
  proPlanCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.05)', // Semi-transparent indigo
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  proPlanCardActive: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  proPlanPrice: {
    color: '#6366f1',
  },
  businessPlanCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)', // Semi-transparent amber
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  businessPlanCardActive: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  businessPlanPrice: {
    color: '#f59e0b',
  },
  planHeader: {
    marginBottom: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f25842',
  },
  planPeriod: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#6b7280',
  },
  planFeatures: {
    marginBottom: 20,
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  upgradeButton: {
    backgroundColor: '#f25842',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  currentBadge: {
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  currentBadgeText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
})
