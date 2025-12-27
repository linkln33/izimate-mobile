import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Share, TextInput, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import * as Clipboard from 'expo-clipboard'
import { supabase } from '@/lib/supabase'
import { formatCurrency, getUserCurrency } from '@/lib/utils/currency'
import { getExchangeRates, convertPriceSync } from '@/lib/utils/exchange-rates'
import type { User, Affiliate, Referral } from '@/lib/types'
import { pastelDesignSystem } from '@/lib/pastel-design-system'
import { Platform } from 'react-native'
const { colors: pastelColors, surfaces, elevation, spacing, borderRadius } = pastelDesignSystem

interface Props {
  user: User | null
}

export function AffiliateTab({ user }: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [showEarningsHistory, setShowEarningsHistory] = useState(false)
  const [payoutMethod, setPayoutMethod] = useState<'bank_transfer' | 'revolut' | 'paypal'>('bank_transfer')
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null)
  const [payoutDetails, setPayoutDetails] = useState({
    paypal_email: '',
    bank_account: '',
    bank_sort_code: '',
    bank_name: '',
    revolut_phone: '',
  })
  const [requestingPayout, setRequestingPayout] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [calculatorPro, setCalculatorPro] = useState('0')
  const [calculatorBusiness, setCalculatorBusiness] = useState('0')

  useEffect(() => {
    loadAffiliateData()
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

  const loadAffiliateData = async () => {
    if (!user?.id) {
      console.log('⚠️ No user ID, cannot load affiliate data')
      setLoading(false)
      return
    }

    try {
      console.log('🔍 Loading affiliate data for user:', user.id)
      // Check if user is already an affiliate - use maybeSingle to avoid errors
      const { data: affiliateData, error: affiliateError } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (affiliateError && affiliateError.code !== 'PGRST116') {
        console.error('❌ Error loading affiliate data:', affiliateError)
        // Check if it's a table doesn't exist error
        if (affiliateError.code === '42P01' || affiliateError.message?.includes('does not exist')) {
          console.error('❌ Affiliates table does not exist in database')
          // Don't throw, just show no affiliate state
        } else {
          throw affiliateError
        }
      }

      if (affiliateData) {
        console.log('✅ Found affiliate data:', affiliateData)
        setAffiliate(affiliateData)
        
        // Load payout settings
        if (affiliateData.payout_method) {
          setPayoutMethod(affiliateData.payout_method)
        }
        if (affiliateData.payout_details) {
          setPayoutDetails({
            paypal_email: affiliateData.payout_details.paypal_email || '',
            bank_account: affiliateData.payout_details.bank_account || '',
            bank_sort_code: affiliateData.payout_details.bank_sort_code || '',
            bank_name: affiliateData.payout_details.bank_name || '',
            revolut_phone: affiliateData.payout_details.revolut_phone || '',
          })
        }

        // Load referrals
        const { data: referralsData, error: referralsError } = await supabase
          .from('referrals')
          .select('*')
          .eq('affiliate_id', affiliateData.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (referralsError) {
          console.error('❌ Error loading referrals:', referralsError)
          // If referrals table doesn't exist, just set empty array
          if (referralsError.code === '42P01' || referralsError.message?.includes('does not exist')) {
            console.warn('⚠️ Referrals table does not exist, using empty array')
            setReferrals([])
          }
        } else if (referralsData) {
          setReferrals(referralsData)
        } else {
          setReferrals([])
        }
      } else {
        // No affiliate found, ensure referrals is empty
        setReferrals([])
      }
    } catch (error: any) {
      console.error('❌ Error loading affiliate data:', error)
      // Don't show error to user if it's just that tables don't exist
      // They'll see the registration screen instead
      if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
        Alert.alert('Error', 'Failed to load affiliate data. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Generate a unique referral code
  const generateReferralCode = (): string => {
    // Generate a code like: IZIMATE-XXXX where XXXX is random alphanumeric
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excluding confusing chars like 0, O, I, 1
    const randomPart = Array.from({ length: 6 }, () => 
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
    return `IZIMATE-${randomPart}`
  }

  const handleRegister = async () => {
    console.log('🔵 handleRegister called', { userId: user?.id, user, registering })
    
    if (registering) {
      console.log('⚠️ Already registering, ignoring duplicate call')
      return
    }
    
    if (!user?.id) {
      console.error('❌ No user ID')
      Alert.alert('Error', 'Please log in to join the affiliate program')
      return
    }

    // No verification required for affiliate program
    console.log('✅ Proceeding with registration')

    setRegistering(true)
    console.log('🔄 Starting registration process...')
    
    // Verify we have an active session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      console.error('❌ No active session:', sessionError)
      Alert.alert('Error', 'Please log in to join the affiliate program')
      setRegistering(false)
      return
    }
    console.log('✅ Active session confirmed:', {
      userId: session.user.id,
      accessToken: session.access_token ? 'present' : 'missing',
      tokenLength: session.access_token?.length || 0
    })
    
    // Verify the user ID matches the session
    if (session.user.id !== user.id) {
      console.error('❌ User ID mismatch:', { sessionUserId: session.user.id, userUserId: user.id })
      Alert.alert('Error', 'User session mismatch. Please log out and log back in.')
      setRegistering(false)
      return
    }
    
    // Ensure Supabase client has the current session
    // This is important for RLS policies to work correctly
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    if (!currentSession) {
      console.error('❌ Failed to get current session for Supabase client')
      Alert.alert('Error', 'Session expired. Please log in again.')
      setRegistering(false)
      return
    }
    console.log('✅ Supabase client session verified')
    
    try {
      // Check if user already has an affiliate record
      console.log('🔍 Checking for existing affiliate...')
      const { data: existingAffiliate, error: checkError } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking existing affiliate:', checkError)
        throw checkError
      }

      if (existingAffiliate) {
        console.log('ℹ️ User already registered as affiliate')
        Alert.alert('Already Registered', 'You are already registered as an affiliate!')
        loadAffiliateData()
        setRegistering(false)
        return
      }

      console.log('✅ No existing affiliate found, creating new one...')

      // Generate a unique referral code - simplified approach
      // Use user ID as part of code to ensure uniqueness
      let referralCode = generateReferralCode()
      let attempts = 0
      const maxAttempts = 5
      let success = false

      // Simplified uniqueness check - just try to insert, if it fails due to unique constraint, retry
      // This is more efficient than checking beforehand
      while (!success && attempts < maxAttempts) {
        try {
          // Use direct INSERT instead of RPC (RPC has schema cache issues)
          // RLS policy allows users to create their own affiliate records
          const userIdToUse = session.user.id
          console.log(`🔄 Attempt ${attempts + 1}: Trying code ${referralCode} for user ${userIdToUse}`)
          
          // Direct INSERT - RLS policy "Users can create own affiliate record" allows this
          const { data: newAffiliate, error: affiliateError } = await supabase
            .from('affiliates')
            .insert({
              user_id: userIdToUse,
              referral_code: referralCode,
              tier: 'standard',
              total_referrals: 0,
              active_referrals: 0,
              total_earnings: 0,
              pending_earnings: 0,
              paid_earnings: 0,
              is_active: true
            })
            .select()
            .single()
          
          console.log('📊 INSERT Result:', { 
            hasData: !!newAffiliate, 
            hasError: !!affiliateError,
            errorCode: affiliateError?.code,
            errorMessage: affiliateError?.message?.substring(0, 100)
          })

          if (affiliateError) {
            console.error('❌ Affiliate creation error:', affiliateError)
            console.error('Error code:', affiliateError.code)
            console.error('Error message:', affiliateError.message)
            // Check if it's a unique constraint violation or referral code exists
            if (
              affiliateError.code === '23505' || 
              affiliateError.message?.includes('unique') || 
              affiliateError.message?.includes('duplicate') ||
              affiliateError.message?.includes('Referral code already exists')
            ) {
              console.log(`⚠️ Code ${referralCode} already exists, generating new one`)
              referralCode = generateReferralCode()
              attempts++
              continue
            } else if (affiliateError.message?.includes('already has an affiliate record')) {
              // User already registered
              console.log('ℹ️ User already registered as affiliate')
              Alert.alert('Already Registered', 'You are already registered as an affiliate!')
              await loadAffiliateData()
              setRegistering(false)
              return
            } else {
              // Some other error - show it to user
              console.error('❌ Unexpected error:', affiliateError)
              Alert.alert('Error', `Failed to register: ${affiliateError.message || affiliateError.code || 'Unknown error'}`)
              setRegistering(false)
              return
            }
          }

          // Success! We created the affiliate
          // Direct INSERT returns the created object
          console.log('📦 Response:', newAffiliate)
          const createdAffiliate = newAffiliate
          
          if (!createdAffiliate) {
            console.error('❌ No affiliate data returned')
            Alert.alert('Error', 'Registration completed but could not retrieve affiliate data. Please refresh.')
            await loadAffiliateData()
            setRegistering(false)
            return
          }
          
          console.log('✅ Affiliate created successfully:', createdAffiliate)
          
          // Also update user's referral_code if they don't have one
          if (!user.referral_code) {
            console.log('📝 Updating user referral code...')
            const { error: updateError } = await supabase
              .from('users')
              .update({ referral_code: referralCode })
              .eq('id', user.id)
            
            if (updateError) {
              console.warn('⚠️ Failed to update user referral code:', updateError)
              // Don't fail the whole process if this fails
            } else {
              console.log('✅ User referral code updated')
            }
          }

          console.log('🎉 Registration complete!')
          success = true
          Alert.alert('Success', `You are now an affiliate!\n\nYour referral code: ${referralCode}`)
          await loadAffiliateData()
          setRegistering(false)
          return
          
        } catch (error: any) {
          console.error('❌ Exception in affiliate creation:', error)
          console.error('Error type:', typeof error)
          console.error('Error keys:', Object.keys(error))
          
          // If it's not a uniqueness error, show it
          if (error.code !== '23505' && !error.message?.includes('unique') && !error.message?.includes('duplicate')) {
            console.error('❌ Error creating affiliate:', error)
            console.error('Full error details:', JSON.stringify(error, null, 2))
            Alert.alert('Error', `Failed to register: ${error.message || error.code || 'Unknown error'}`)
            setRegistering(false)
            return
          }
          
          // It's a uniqueness error, try again
          console.log('⚠️ Uniqueness error, retrying with new code')
          referralCode = generateReferralCode()
          attempts++
        }
      }

      // If we exhausted all attempts
      if (!success) {
        Alert.alert('Error', 'Failed to generate unique referral code after multiple attempts. Please try again.')
        setRegistering(false)
      }
    } catch (error: any) {
      console.error('❌ Error registering affiliate:', error)
      console.error('Error stack:', error.stack)
      console.error('Error type:', typeof error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to register as affiliate.'
      if (error.code === '42883' || (error.message?.includes('function') && error.message?.includes('does not exist'))) {
        errorMessage = 'The affiliate system is not fully configured. Please contact support.'
      } else if (error.code === '42P01' || error.message?.includes('does not exist')) {
        errorMessage = 'Database tables are missing. Please contact support.'
      } else if (error.message) {
        errorMessage = error.message
      } else if (error.toString) {
        errorMessage = error.toString()
      }
      
      Alert.alert('Error', errorMessage)
    } finally {
      setRegistering(false)
      console.log('🏁 Registration process finished')
    }
  }

  const handleCopyCode = async () => {
    if (!affiliate) return
    await Clipboard.setStringAsync(affiliate.referral_code)
    Alert.alert('Copied!', 'Referral code copied to clipboard')
  }

  const handleCopyUrl = async () => {
    if (!affiliate) return
    const referralUrl = `https://izimate.com/auth/signup?ref=${affiliate.referral_code}`
    await Clipboard.setStringAsync(referralUrl)
    Alert.alert('Copied!', 'Referral URL copied to clipboard')
  }

  const handleShare = async () => {
    if (!affiliate) return

    const referralUrl = `https://izimate.com/auth/signup?ref=${affiliate.referral_code}`
    
    try {
      await Share.share({
        message: `Join iZimate Job using my referral code: ${affiliate.referral_code}\n${referralUrl}`,
        url: referralUrl,
      })
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }

  const handleSavePayoutSettings = async () => {
    if (!affiliate) return

    try {
      const { error } = await supabase
        .from('affiliates')
        .update({
          payout_method: payoutMethod,
          payout_details: payoutDetails,
        })
        .eq('id', affiliate.id)

      if (error) throw error

      Alert.alert('Success', 'Payout settings saved')
      setShowPayoutModal(false)
      loadAffiliateData()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save payout settings')
    }
  }

  const handleRequestPayout = async () => {
    if (!affiliate || affiliate.pending_earnings <= 0) {
      Alert.alert('Error', 'No pending earnings to withdraw')
      return
    }

    if (!affiliate.payout_method) {
      Alert.alert('Error', 'Please configure your payout method first')
      setShowPayoutModal(true)
      return
    }

    setRequestingPayout(true)
    try {
      const API_URL = process.env.EXPO_PUBLIC_SITE_URL || 'https://izimate.com'
      const response = await fetch(`${API_URL}/api/affiliate/request-payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          affiliateId: affiliate.id,
          amount: affiliate.pending_earnings,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Server error: ${response.status}`)
      }

      const data = await response.json()
      Alert.alert('Success', 'Payout request submitted successfully')
      await loadAffiliateData()
    } catch (error: any) {
      console.error('❌ Error requesting payout:', error)
      Alert.alert('Error', error.message || 'Failed to request payout. Please try again later.')
    } finally {
      setRequestingPayout(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={pastelColors.primary[500]} />
        <Text style={styles.loadingText}>Loading affiliate data...</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Please log in to access the affiliate program</Text>
      </View>
    )
  }

  if (!affiliate) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.welcomeCard}>
          <Ionicons name="people" size={64} color="#f25842" />
          <Text style={styles.welcomeTitle}>Join the Affiliate Program</Text>
          <Text style={styles.welcomeText}>
            Earn {formatCurrency(3, user?.currency || 'GBP')} per signup + 10% recurring! Refer friends and colleagues to start earning.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.registerButton, 
              (registering || pressed) && styles.registerButtonDisabled
            ]}
            onPress={async () => {
              console.log('🔴 BUTTON CLICKED!', { 
                user: user?.id, 
                registering,
                timestamp: new Date().toISOString()
              })
              if (registering) {
                console.log('⚠️ Already processing, ignoring click')
                return
              }
              try {
                await handleRegister()
              } catch (error: any) {
                console.error('❌ Error in button handler:', error)
                Alert.alert(
                  'Error', 
                  error?.message || 'An unexpected error occurred. Please try again.'
                )
                setRegistering(false)
              }
            }}
            disabled={registering}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
          >
            {registering ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.registerButtonText}>Registering...</Text>
              </>
            ) : (
              <Text style={styles.registerButtonText}>Start Earning Now</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    )
  }

  const conversionRate = affiliate.total_referrals > 0
    ? Math.round((affiliate.active_referrals / affiliate.total_referrals) * 100)
    : 0

  // Calculate earnings breakdown
  const oneTimeEarnings = referrals.reduce((sum, r) => sum + (r.one_time_commission_paid ? r.one_time_commission_amount : 0), 0)
  const recurringEarnings = referrals.reduce((sum, r) => sum + r.recurring_commission_total, 0)

  // Get user currency
  const userCurrency = user ? getUserCurrency(user.currency, user.country) : 'GBP'
  
  // Use real-time exchange rates (with fallback to default if not loaded yet)
  const rates = exchangeRates || { GBP: 1.0 }

  // Commission amounts in user's currency using real-time exchange rates
  const proOneTime = convertPriceSync(1.99, userCurrency, rates)
  const proMonthly = convertPriceSync(0.995, userCurrency, rates)
  const proTotal = convertPriceSync(14.94, userCurrency, rates)
  const businessOneTime = convertPriceSync(5.99, userCurrency, rates)
  const businessMonthly = convertPriceSync(2.995, userCurrency, rates)
  const businessTotal = convertPriceSync(40.94, userCurrency, rates)
  
  if (__DEV__ && user) {
    console.log('💰 AffiliateTab: Using currency:', userCurrency, 'from user.currency:', user.currency, 'user.country:', user.country)
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Main Container */}
      <View style={styles.mainContainer}>
        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{affiliate.total_referrals}</Text>
            <Text style={styles.statLabel}>{t('dashboard.affiliate.totalReferrals')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{affiliate.active_referrals}</Text>
            <Text style={styles.statLabel}>{t('dashboard.affiliate.active')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{conversionRate}%</Text>
            <Text style={styles.statLabel}>{t('dashboard.affiliate.conversion')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatCurrency(affiliate.total_earnings, userCurrency)}</Text>
            <Text style={styles.statLabel}>{t('dashboard.affiliate.totalEarnings')}</Text>
          </View>
        </View>

        {/* Earnings Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.affiliate.earningsBreakdown')}</Text>
          <View style={styles.formInput}>
            <Text style={styles.formLabel}>{t('dashboard.affiliate.oneTimeCommissions')}</Text>
            <Text style={styles.formValue}>{formatCurrency(oneTimeEarnings, userCurrency)}</Text>
          </View>
          <View style={styles.formInput}>
            <Text style={styles.formLabel}>{t('dashboard.affiliate.recurringCommissions')}</Text>
            <Text style={styles.formValue}>{formatCurrency(recurringEarnings, userCurrency)}</Text>
          </View>
        </View>

        {/* Referral Code */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.affiliate.yourReferralCode')}</Text>
          
          {/* Code Display with Copy Button */}
          <View style={styles.codeDisplayContainer}>
            <View style={styles.formInput}>
              <Text style={styles.referralCode}>{affiliate.referral_code}</Text>
            </View>
            <Pressable style={styles.copyCodeButton} onPress={handleCopyCode}>
              <Ionicons name="copy-outline" size={18} color="#ffffff" />
            </Pressable>
          </View>

          {/* Action Buttons */}
          <View style={styles.referralActions}>
            <Pressable style={styles.formButton} onPress={handleCopyUrl}>
              <Ionicons name="copy-outline" size={16} color="#6b7280" />
              <Text style={styles.formButtonText}>{t('dashboard.affiliate.copyUrl')}</Text>
            </Pressable>
            <Pressable style={styles.formButtonPrimary} onPress={handleShare}>
              <Ionicons name="share-social" size={18} color="#ffffff" />
              <Text style={styles.formButtonPrimaryText}>{t('dashboard.affiliate.share')}</Text>
            </Pressable>
          </View>
          
          <View style={styles.formInput}>
            <Text style={styles.referralUrl}>
              https://izimate.com/auth/signup?ref={affiliate.referral_code}
            </Text>
          </View>
        </View>

        {/* Commission Legend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.affiliate.commissionStructure')}</Text>
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={styles.legendIcon}>
                <Ionicons name="cash-outline" size={20} color={pastelColors.primary[500]} />
              </View>
              <View style={styles.legendContent}>
                <Text style={styles.legendTitle}>{t('dashboard.affiliate.oneTimeCommission')}</Text>
                <Text style={styles.legendDescription}>{t('dashboard.affiliate.oneTimeCommissionDesc')}</Text>
              </View>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendIcon}>
                <Ionicons name="repeat-outline" size={20} color={pastelColors.primary[500]} />
              </View>
              <View style={styles.legendContent}>
                <Text style={styles.legendTitle}>{t('dashboard.affiliate.recurringCommission')}</Text>
                <Text style={styles.legendDescription}>{t('dashboard.affiliate.recurringCommissionDesc')}</Text>
              </View>
            </View>
          </View>
          <View style={styles.commissionExamples}>
            <View style={styles.commissionExample}>
              <Text style={styles.commissionExampleTitle}>{t('dashboard.proPlan')} ({formatCurrency(9.95, userCurrency)}{t('dashboard.month')})</Text>
              <Text style={styles.commissionExampleText}>
                {t('dashboard.affiliate.oneTime')}: {formatCurrency(proOneTime, userCurrency)} • {t('dashboard.affiliate.monthly')}: {formatCurrency(proMonthly, userCurrency)} • {t('dashboard.affiliate.total12mo')}: {formatCurrency(proTotal, userCurrency)}
              </Text>
            </View>
            <View style={styles.commissionExample}>
              <Text style={styles.commissionExampleTitle}>{t('dashboard.businessPlan')} ({formatCurrency(29.95, userCurrency)}{t('dashboard.month')})</Text>
              <Text style={styles.commissionExampleText}>
                {t('dashboard.affiliate.oneTime')}: {formatCurrency(businessOneTime, userCurrency)} • {t('dashboard.affiliate.monthly')}: {formatCurrency(businessMonthly, userCurrency)} • {t('dashboard.affiliate.total12mo')}: {formatCurrency(businessTotal, userCurrency)}
              </Text>
            </View>
          </View>
          <Text style={styles.proUserNote}>{t('dashboard.affiliate.availableToProBusiness')}</Text>
        </View>

        {/* Earnings Calculator */}
        <View style={styles.section}>
          <Pressable 
            style={styles.calculatorHeader}
            onPress={() => setShowCalculator(!showCalculator)}
          >
            <View>
              <Text style={styles.sectionTitle}>{t('dashboard.affiliate.earningsCalculator')}</Text>
              <Text style={styles.calculatorSubtitle}>{t('dashboard.affiliate.estimateEarnings')}</Text>
            </View>
            <Ionicons 
              name={showCalculator ? "chevron-up" : "chevron-down"} 
              size={24} 
              color={surfaces.onSurfaceVariant} 
            />
          </Pressable>
          
          {showCalculator && (
            <View style={styles.calculatorContent}>
              <View style={styles.calculatorInputGroup}>
                <Text style={styles.calculatorLabel}>{t('dashboard.affiliate.proPlanReferrals')}</Text>
                <TextInput
                  style={styles.calculatorInput}
                  value={calculatorPro}
                  onChangeText={setCalculatorPro}
                  keyboardType="numeric"
                  placeholder="0"
                />
                <Text style={styles.calculatorHint}>
                  {t('dashboard.affiliate.oneTime')}: {formatCurrency(proOneTime, userCurrency)} {t('dashboard.affiliate.each')}
                </Text>
              </View>
              
              <View style={styles.calculatorInputGroup}>
                <Text style={styles.calculatorLabel}>{t('dashboard.affiliate.businessPlanReferrals')}</Text>
                <TextInput
                  style={styles.calculatorInput}
                  value={calculatorBusiness}
                  onChangeText={setCalculatorBusiness}
                  keyboardType="numeric"
                  placeholder="0"
                />
                <Text style={styles.calculatorHint}>
                  {t('dashboard.affiliate.oneTime')}: {formatCurrency(businessOneTime, userCurrency)} {t('dashboard.affiliate.each')}
                </Text>
              </View>

              <View style={styles.calculatorResults}>
                <View style={styles.calculatorResultRow}>
                  <Text style={styles.calculatorResultLabel}>{t('dashboard.affiliate.oneTimeEarnings')}</Text>
                  <Text style={styles.calculatorResultValue}>
                    {formatCurrency(
                      (parseFloat(calculatorPro) || 0) * proOneTime + 
                      (parseFloat(calculatorBusiness) || 0) * businessOneTime,
                      userCurrency
                    )}
                  </Text>
                </View>
                <View style={styles.calculatorResultRow}>
                  <Text style={styles.calculatorResultLabel}>{t('dashboard.affiliate.recurringEarnings')}</Text>
                  <Text style={styles.calculatorResultValue}>
                    {formatCurrency(
                      (parseFloat(calculatorPro) || 0) * proMonthly + 
                      (parseFloat(calculatorBusiness) || 0) * businessMonthly,
                      userCurrency
                    )}
                  </Text>
                </View>
                <View style={styles.calculatorResultRow}>
                  <Text style={styles.calculatorResultLabel}>{t('dashboard.affiliate.total12Months')}</Text>
                  <Text style={[styles.calculatorResultValue, styles.calculatorResultTotal]}>
                    {formatCurrency(
                      (parseFloat(calculatorPro) || 0) * proTotal + 
                      (parseFloat(calculatorBusiness) || 0) * businessTotal,
                      userCurrency
                    )}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Payout Management */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard.affiliate.payoutSettings')}</Text>
            <Pressable onPress={() => setShowPayoutModal(true)}>
              <Ionicons name="settings-outline" size={20} color="#f25842" />
            </Pressable>
          </View>
          <View style={styles.formInput}>
            <Text style={styles.formLabel}>{t('dashboard.affiliate.method')}</Text>
            <Text style={styles.formValue}>
              {affiliate.payout_method ? 
                (affiliate.payout_method === 'bank_transfer' ? 'Bank' : 
                 affiliate.payout_method === 'revolut' ? 'Revolut' : 
                 affiliate.payout_method === 'paypal' ? 'PayPal' : 
                 affiliate.payout_method.replace('_', ' ')) : 'Not set'}
            </Text>
          </View>
          {affiliate.pending_earnings > 0 && (
            <Pressable
              style={[styles.formButtonPrimary, requestingPayout && styles.formButtonDisabled]}
              onPress={handleRequestPayout}
              disabled={requestingPayout}
            >
              {requestingPayout ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.formButtonPrimaryText}>Request Payout</Text>
                  <Text style={styles.formButtonPrimaryText}>{formatCurrency(affiliate.pending_earnings, userCurrency)}</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        {/* Earnings History Toggle */}
        <Pressable style={styles.formInput} onPress={() => setShowEarningsHistory(!showEarningsHistory)}>
          <Text style={styles.formLabel}>
            {showEarningsHistory ? 'Hide' : 'Show'} Earnings History
          </Text>
          <Ionicons 
            name={showEarningsHistory ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#6b7280" 
          />
        </Pressable>

        {/* Earnings History */}
        {showEarningsHistory && (
          <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings History</Text>
          {referrals.length === 0 ? (
            <Text style={styles.emptyText}>No earnings yet</Text>
          ) : (
            referrals.map((referral) => (
              <View key={referral.id} style={styles.historyItem}>
                <View style={styles.historyItemHeader}>
                  <View>
                    <Text style={styles.historyItemDate}>
                      {new Date(referral.created_at).toLocaleDateString()}
                    </Text>
                    <Text style={styles.historyItemCode}>Code: {referral.referral_code}</Text>
                  </View>
                  <Text style={styles.historyItemAmount}>{formatCurrency(referral.total_earned, userCurrency)}</Text>
                </View>
                <View style={styles.historyItemDetails}>
                  {referral.one_time_commission_amount > 0 && (
                    <Text style={styles.historyItemDetail}>
                      One-time: {formatCurrency(referral.one_time_commission_amount, userCurrency)} 
                      {referral.one_time_commission_paid ? ' ✓ Paid' : ' ⏳ Pending'}
                    </Text>
                  )}
                  {referral.recurring_commission_total > 0 && (
                    <Text style={styles.historyItemDetail}>
                      Recurring: {formatCurrency(referral.recurring_commission_total, userCurrency)} 
                      ({referral.recurring_commission_months} months)
                    </Text>
                  )}
                  <View style={[
                    styles.historyStatusBadge,
                    referral.status === 'active' && styles.historyStatusBadgeActive,
                    referral.status === 'converted' && styles.historyStatusBadgeSuccess,
                  ]}>
                    <Text style={styles.historyStatusText}>
                      {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}

        {/* Recent Referrals */}
        {referrals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Referrals ({referrals.length})</Text>
            {referrals.map((referral) => (
              <View key={referral.id} style={styles.formInput}>
                <View style={styles.formRow}>
                  <View>
                    <Text style={styles.formLabel}>{referral.referral_code}</Text>
                    <Text style={styles.formSubtext}>
                      {new Date(referral.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    referral.status === 'converted' && styles.statusBadgeSuccess,
                    referral.status === 'active' && styles.statusBadgeActive,
                  ]}>
                    <Text style={styles.statusBadgeText}>
                      {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                    </Text>
                  </View>
                </View>
                {referral.plan_type && (
                  <Text style={styles.formSubtext}>
                    {referral.plan_type.charAt(0).toUpperCase() + referral.plan_type.slice(1)} Plan
                  </Text>
                )}
                <Text style={styles.formValue}>
                  Total: {formatCurrency(referral.total_earned, userCurrency)}
                </Text>
                {referral.one_time_commission_amount > 0 && (
                  <Text style={styles.formSubtext}>
                    One-time: {formatCurrency(referral.one_time_commission_amount, userCurrency)}
                  </Text>
                )}
                {referral.recurring_commission_total > 0 && (
                  <Text style={styles.formSubtext}>
                    Recurring: {formatCurrency(referral.recurring_commission_total, userCurrency)} ({referral.recurring_commission_months} months)
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Payout Settings Modal */}
      <Modal
        visible={showPayoutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPayoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payout Settings</Text>
              <Pressable onPress={() => setShowPayoutModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalLabel}>Payout Method</Text>
              <View style={styles.payoutMethodOptions}>
                {(['bank_transfer', 'revolut', 'paypal'] as const).map((method) => (
                  <Pressable
                    key={method}
                    style={[
                      styles.payoutMethodOption,
                      payoutMethod === method && styles.payoutMethodOptionActive,
                    ]}
                    onPress={() => setPayoutMethod(method)}
                  >
                    <Text style={[
                      styles.payoutMethodOptionText,
                      payoutMethod === method && styles.payoutMethodOptionTextActive,
                    ]}>
                      {method === 'bank_transfer' ? 'BANK' : 
                       method === 'revolut' ? 'REVOLUT' : 
                       method === 'paypal' ? 'PAYPAL' : method.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {payoutMethod === 'paypal' && (
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>PayPal Email</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={payoutDetails.paypal_email}
                    onChangeText={(text) => setPayoutDetails({ ...payoutDetails, paypal_email: text })}
                    placeholder="your@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              )}

              {payoutMethod === 'revolut' && (
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>{t('payment.revolutPhone')}</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={payoutDetails.revolut_phone}
                    onChangeText={(text) => setPayoutDetails({ ...payoutDetails, revolut_phone: text })}
                    placeholder="+44 7XXX XXXXXX"
                    keyboardType="phone-pad"
                  />
                </View>
              )}

              {payoutMethod === 'bank_transfer' && (
                <>
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.modalLabel}>{t('payment.bankName')}</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={payoutDetails.bank_name}
                      onChangeText={(text) => setPayoutDetails({ ...payoutDetails, bank_name: text })}
                      placeholder={t('payment.bankName')}
                    />
                  </View>
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.modalLabel}>{t('payment.accountNumber')}</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={payoutDetails.bank_account}
                      onChangeText={(text) => setPayoutDetails({ ...payoutDetails, bank_account: text })}
                      placeholder={t('payment.accountNumber')}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.modalLabel}>{t('payment.sortCode')}</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={payoutDetails.bank_sort_code}
                      onChangeText={(text) => setPayoutDetails({ ...payoutDetails, bank_sort_code: text })}
                      placeholder={t('payment.sortCode')}
                      keyboardType="numeric"
                    />
                  </View>
                </>
              )}

              <Pressable style={styles.modalSaveButton} onPress={handleSavePayoutSettings}>
                <Text style={styles.modalSaveButtonText}>Save Settings</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Remove white background
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    paddingVertical: spacing.md, // Keep vertical padding
    paddingHorizontal: 0, // Remove horizontal padding - match location box width
  },
  mainContainer: {
    backgroundColor: 'transparent', // Transparent - sections are individual cards
    borderRadius: 0, // No container border
    padding: 0, // No padding - sections handle their own spacing
    marginHorizontal: 0, // No horizontal margin
  },
  section: {
    backgroundColor: surfaces.surface, // Match overview card style
    borderRadius: borderRadius.lg, // 16px - match overview
    padding: spacing.lg, // Match overview
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    ...elevation.level2, // Match overview - no borders
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  formInput: {
    backgroundColor: 'transparent', // Transparent inside section cards
    borderRadius: borderRadius.md, // 12px - form-sized
    padding: spacing.md, // 12px
    marginBottom: spacing.sm,
    borderWidth: 0, // No borders - section card provides elevation
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: surfaces.onSurface,
    marginBottom: spacing.xs,
  },
  formValue: {
    fontSize: 16,
    fontWeight: '600',
    color: surfaces.onSurface,
  },
  formSubtext: {
    fontSize: 12,
    color: surfaces.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  formButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: surfaces.background, // Match page background
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md, // Form-sized
    gap: spacing.xs,
    ...elevation.level1, // Use elevation instead of borders
  },
  formButtonText: {
    color: surfaces.onSurface,
    fontSize: 14,
    fontWeight: '500',
  },
  formButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: pastelColors.primary[400],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md, // Form-sized
    gap: spacing.sm,
    ...elevation.level1,
  },
  formButtonPrimaryText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  formButtonDisabled: {
    backgroundColor: pastelColors.neutral[300],
  },
  welcomeCard: {
    backgroundColor: pastelColors.primary[100], // Light teal #E0FBFB
    borderRadius: borderRadius.lg,
    padding: spacing['2xl'],
    alignItems: 'center',
    ...elevation.level2,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: surfaces.onSurface,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  welcomeText: {
    fontSize: 16,
    color: surfaces.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing['2xl'],
  },
  registerButton: {
    backgroundColor: pastelColors.primary[400], // Slightly darker teal for better contrast
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    flexDirection: 'row',
    ...elevation.level1,
  },
  registerButtonDisabled: {
    backgroundColor: pastelColors.neutral[300],
  },
  registerButtonText: {
    color: pastelColors.primary[900], // Very dark teal for better contrast
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md, // Match overview spacing
    marginBottom: spacing.lg,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: surfaces.surface, // Match overview stat cards
    borderRadius: borderRadius.lg, // 16px - match overview
    padding: spacing.lg, // Match overview
    alignItems: 'center',
    minHeight: 140, // Match overview
    justifyContent: 'center',
    ...elevation.level2, // Match overview - no borders
  },
  statValue: {
    fontSize: 36, // Match overview
    fontWeight: 'bold',
    color: surfaces.onSurface,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: 13, // Match overview
    color: pastelColors.secondary[600], // Match overview link color
    marginTop: spacing.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  referralTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: surfaces.onSurface,
    marginBottom: spacing.sm,
  },
  codeExplanation: {
    fontSize: 12,
    color: surfaces.onSurfaceVariant,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  referralCode: {
    fontSize: 16,
    fontWeight: '600',
    color: pastelColors.primary[500],
    letterSpacing: 1,
    textAlign: 'center',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pastelColors.primary[400], // Slightly darker teal for better contrast
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
    ...elevation.level1,
  },
  shareButtonText: {
    color: pastelColors.primary[900], // Very dark teal for better contrast
    fontSize: 14,
    fontWeight: '600',
  },
  referralUrl: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  tierTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: surfaces.onSurface,
    marginBottom: spacing.sm,
  },
  tierDescription: {
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  proUserNote: {
    fontSize: 12,
    color: pastelColors.primary[500],
    fontStyle: 'italic',
    fontWeight: '500',
  },
  referralsSection: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: surfaces.onSurface,
    marginBottom: spacing.md,
  },
  referralItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  referralItemCode: {
    fontSize: 16,
    fontWeight: '600',
    color: surfaces.onSurface,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: pastelColors.secondary[100],
    ...elevation.level1,
  },
  statusBadgeSuccess: {
    backgroundColor: pastelColors.success[100],
  },
  statusBadgeActive: {
    backgroundColor: pastelColors.secondary[100],
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: surfaces.onSurface,
  },
  referralItemPlan: {
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  referralItemEarnings: {
    fontSize: 14,
    fontWeight: '600',
    color: pastelColors.success[500],
  },
  codeDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  copyCodeButton: {
    backgroundColor: pastelColors.primary[500],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
    ...elevation.level2,
  },
  copyButton: {
    padding: 8,
    marginLeft: 8,
  },
  referralActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  payoutInfo: {
    gap: 12,
  },
  payoutMethod: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  requestPayoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: pastelColors.primary[400], // Slightly darker teal for better contrast
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.sm,
    ...elevation.level1,
  },
  requestPayoutButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  requestPayoutText: {
    color: pastelColors.primary[900], // Very dark teal for better contrast
    fontSize: 16,
    fontWeight: '600',
  },
  requestPayoutAmount: {
    color: pastelColors.primary[900], // Very dark teal for better contrast
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  historySection: {
    marginBottom: 20,
  },
  historyItem: {
    backgroundColor: surfaces.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...elevation.level2,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  historyItemDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  historyItemCode: {
    fontSize: 14,
    color: '#6b7280',
  },
  historyItemAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: pastelColors.success[500],
  },
  historyItemDetails: {
    gap: 6,
  },
  historyItemDetail: {
    fontSize: 13,
    color: '#6b7280',
  },
  historyStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    marginTop: 8,
  },
  historyStatusBadgeActive: {
    backgroundColor: '#dbeafe',
  },
  historyStatusBadgeSuccess: {
    backgroundColor: '#d1fae5',
  },
  historyStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  referralItemDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  referralEarningsBreakdown: {
    marginTop: 8,
    gap: 4,
  },
  referralItemDetail: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    padding: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  payoutMethodOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  payoutMethodOption: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    backgroundColor: surfaces.surfaceVariant,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    ...elevation.level1,
  },
  payoutMethodOptionActive: {
    backgroundColor: pastelColors.primary[100],
    borderColor: pastelColors.primary[500],
  },
  payoutMethodOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: surfaces.onSurfaceVariant,
  },
  payoutMethodOptionTextActive: {
    color: pastelColors.primary[600],
    fontWeight: '600',
  },
  modalInputGroup: {
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: pastelColors.primary[50], // Very light teal #F0FDFD
    borderRadius: 12, // More rounded corners
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalSaveButton: {
    backgroundColor: pastelColors.primary[500],
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...elevation.level1,
  },
  modalSaveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  legendContainer: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  legendIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: pastelColors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendContent: {
    flex: 1,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: surfaces.onSurface,
    marginBottom: spacing.xs,
  },
  legendDescription: {
    fontSize: 13,
    color: surfaces.onSurfaceVariant,
    lineHeight: 18,
  },
  commissionExamples: {
    marginTop: spacing.md,
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: surfaces.surfaceVariant,
  },
  commissionExample: {
    padding: spacing.md,
    backgroundColor: pastelColors.primary[50],
    borderRadius: borderRadius.md,
  },
  commissionExampleTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: surfaces.onSurface,
    marginBottom: spacing.xs,
  },
  commissionExampleText: {
    fontSize: 12,
    color: surfaces.onSurfaceVariant,
    lineHeight: 16,
  },
  calculatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calculatorSubtitle: {
    fontSize: 12,
    color: surfaces.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  calculatorContent: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  calculatorInputGroup: {
    marginBottom: spacing.md,
  },
  calculatorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: surfaces.onSurface,
    marginBottom: spacing.sm,
  },
  calculatorInput: {
    backgroundColor: pastelColors.primary[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: surfaces.onSurface,
    borderWidth: 1,
    borderColor: surfaces.surfaceVariant,
  },
  calculatorHint: {
    fontSize: 12,
    color: surfaces.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  calculatorResults: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: pastelColors.success[50],
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  calculatorResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calculatorResultLabel: {
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
  },
  calculatorResultValue: {
    fontSize: 16,
    fontWeight: '600',
    color: pastelColors.success[600],
  },
  calculatorResultTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: pastelColors.success[700],
  },
})
