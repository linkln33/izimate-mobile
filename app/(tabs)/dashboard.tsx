import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Platform, Alert, useWindowDimensions } from 'react-native'
import { SkeletonLoader } from '@/components/common/SkeletonLoader'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { supabase } from '@/lib/supabase'
import { getUnreadNotificationCount } from '@/lib/utils/notifications'
import { BillingTab } from '@/components/dashboard/BillingTab'
import { AffiliateTab } from '@/components/dashboard/AffiliateTab'
import { VerificationTab } from '@/components/dashboard/VerificationTab'
import { CollapsibleSection } from '@/components/dashboard/CollapsibleSection'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { QuickRebookingWidget } from '@/components/booking/QuickRebookingWidget'
import { UnifiedBookingsTab } from '@/components/booking/UnifiedBookingsTab'
import { BusinessBookingsTab } from '@/components/booking/BusinessBookingsTab'
import type { Listing, Match, User } from '@/lib/types'
import { useTranslation } from 'react-i18next'
import { pastelDesignSystem } from '@/lib/pastel-design-system'
const { colors: pastelColors, surfaces, elevation, spacing, borderRadius } = pastelDesignSystem

interface DashboardStats {
  totalListings: number
  activeMatches: number
  unreadMessages: number
  pendingLikes: number
  pendingApprovals: number
  unreadNotifications: number
}


export default function DashboardScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams()
  
  const [user, setUser] = useState<User | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalListings: 0,
    activeMatches: 0,
    unreadMessages: 0,
    pendingLikes: 0,
    pendingApprovals: 0,
    unreadNotifications: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Track if we've already processed the Stripe success
  const stripeProcessedRef = useRef(false)
  
  useEffect(() => {
    loadDashboardData()
  }, []) // Only run once on mount

  // Handle Stripe checkout success separately to avoid re-render loops
  useEffect(() => {
    const success = params.success === 'true'
    const plan = params.plan as string | undefined
    
    if (success && plan && !stripeProcessedRef.current) {
      stripeProcessedRef.current = true
      
      Alert.alert(
        'Payment Successful!',
        `Your ${plan} plan subscription is being activated. This may take a few moments.`,
        [{ text: 'OK' }]
      )
      
      // Process affiliate conversion if user was referred
      if (user?.id && (plan === 'pro' || plan === 'business')) {
        (async () => {
          try {
            const { processAffiliateConversion } = await import('@/lib/utils/affiliate-tracking')
            await processAffiliateConversion(user.id, plan as 'pro' | 'business')
          } catch (error) {
            console.error('Error processing affiliate conversion:', error)
          }
        })()
      }
      
      // Reload subscription data after a delay
      setTimeout(() => {
        loadDashboardData()
        stripeProcessedRef.current = false // Reset after processing
      }, 3000)
    }
  }, [params.success, params.plan, user?.id])

  // Reload user data when screen comes into focus (e.g., after currency change)
  // Use ref to track last fetch time and prevent excessive reloads
  const lastUserFetchRef = useRef<number>(0)
  const USER_FETCH_COOLDOWN = 5000 // 5 seconds

  useFocusEffect(
    useCallback(() => {
      // Only reload user data, not all dashboard data
      const reloadUser = async () => {
        const now = Date.now()
        // Skip if recently fetched (within cooldown period)
        if (now - lastUserFetchRef.current < USER_FETCH_COOLDOWN) {
          return
        }
        lastUserFetchRef.current = now

        try {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          if (!authUser) return

          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single()

          if (userData) {
            setUser(userData)
          }
        } catch (error) {
          if (__DEV__) {
            console.error('Error reloading user:', error)
          }
        }
      }
      reloadUser()
    }, [])
  )


  const loadDashboardData = async () => {
    try {
      setLoading(true)

      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.replace('/(auth)/login')
        return
      }

      // Fetch user profile
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (userData) {
        setUser(userData)
      }

      // Fetch user's listings
      const { data: listingsData } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10)

      if (listingsData) {
        setListings(listingsData)
      }

      // Fetch matches (active = pending or negotiating)
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .or(`customer_id.eq.${authUser.id},provider_id.eq.${authUser.id}`)
        .in('status', ['pending', 'negotiating'])
        .order('matched_at', { ascending: false })
        .limit(10)

      if (matchesData) {
        setMatches(matchesData)
      }

      // Count unread messages - get all user's matches first (including all statuses for message count)
      const { data: allMatchesData } = await supabase
        .from('matches')
        .select('id')
        .or(`customer_id.eq.${authUser.id},provider_id.eq.${authUser.id}`)
        .limit(100)

      let unreadCount = 0
      if (allMatchesData && allMatchesData.length > 0) {
        const matchIds = allMatchesData.map(m => m.id)
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('match_id', matchIds)
          .neq('sender_id', authUser.id)
          .is('read_at', null)
        unreadCount = count || 0
      }

      // Count pending likes
      // A swipe is "pending" if there's no match yet (same logic as ListingsTab.tsx)
      let pendingLikesCount = 0
      if (listingsData && listingsData.length > 0) {
        const listingIds = listingsData.map(l => l.id).filter(Boolean)
        if (listingIds.length > 0) {
          // Get all right swipes on user's listings
          const { data: swipes, error: swipesError } = await supabase
            .from('swipes')
            .select('id, listing_id, swiper_id')
            .eq('swipe_type', 'customer_on_listing')
            .eq('direction', 'right')
            .in('listing_id', listingIds)
          
          if (swipesError) {
            console.error('Error counting pending likes:', swipesError)
            pendingLikesCount = 0
          } else if (swipes && swipes.length > 0) {
            // Get all existing matches for these listings
            const customerIds = swipes.map(s => s.swiper_id).filter(Boolean) as string[]
            const { data: existingMatches } = await supabase
              .from('matches')
              .select('listing_id, customer_id')
              .in('listing_id', listingIds)
              .in('customer_id', customerIds)
            
            // Count swipes that don't have matches yet
            const approvedIds = new Set(
              existingMatches?.map(m => `${m.listing_id}-${m.customer_id}`) || []
            )
            pendingLikesCount = swipes.filter(
              s => !approvedIds.has(`${s.listing_id}-${s.swiper_id}`)
            ).length
          }
        }
      }

      // Count pending approvals
      const { count: pendingApprovalsCount } = await supabase
        .from('pending_approvals')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', authUser.id)
        .eq('status', 'pending')

      // Count unread notifications
      const unreadNotifications = await getUnreadNotificationCount(authUser.id)

      setStats({
        totalListings: listingsData?.length || 0,
        activeMatches: matchesData?.length || 0,
        unreadMessages: unreadCount || 0,
        pendingLikes: pendingLikesCount || 0,
        pendingApprovals: pendingApprovalsCount || 0,
        unreadNotifications,
      })
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadDashboardData()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <SkeletonLoader type="card" count={3} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerGradient}>
        {Platform.OS !== 'web' && (
          <BlurView
            intensity={80}
            tint="light"
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>{t('dashboard.welcomeBack')}</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <View style={styles.headerActions}>
            <NotificationBell />
            <Pressable 
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.settingsButton}
            >
              <Ionicons name="settings-outline" size={24} color="#FF6B8A" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Scrollable Dashboard with Collapsible Sections */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {/* Overview Section - Combined listings, messages, liked, and approvals */}
        <CollapsibleSection
          title={t('dashboard.overview')}
          icon="home"
          iconColor="#3b82f6"
          defaultExpanded={true}
        >
          <OverviewTab
            user={user}
            listings={listings}
            matches={matches}
            stats={stats}
            router={router}
          />
        </CollapsibleSection>


        {/* Billing Section */}
        <CollapsibleSection
          title={t('dashboard.billing')}
          icon="card"
          iconColor="#10b981"
        >
          <BillingTab user={user} />
        </CollapsibleSection>

        {/* Affiliate Section */}
        <CollapsibleSection
          title={t('dashboard.affiliateProgram')}
          icon="people"
          iconColor="#8b5cf6"
          defaultExpanded={params.section === 'affiliate'}
        >
          <AffiliateTab user={user} />
        </CollapsibleSection>

        {/* Verification Section */}
        <CollapsibleSection
          title={t('dashboard.verificationCenter')}
          icon="shield-checkmark"
          iconColor="#f59e0b"
        >
          <VerificationTab user={user} />
        </CollapsibleSection>

        {/* My Bookings Section - Customer bookings */}
        {user && (
        <CollapsibleSection
            title={t('dashboard.myBookings')}
          icon="calendar"
          iconColor="#14b8a6"
        >
            <UnifiedBookingsTab 
              userId={user.id}
            />
        </CollapsibleSection>
        )}

        {/* Business Section - Provider business management */}
        {user && listings.length > 0 && (
        <CollapsibleSection
            title={t('dashboard.business')}
          icon="briefcase"
          iconColor="#6366f1"
        >
            <BusinessBookingsTab 
              userId={user.id}
            />
        </CollapsibleSection>
        )}


        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Pressable 
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed
            ]} 
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={pastelColors.error[500]} />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  )
}

// Overview Tab Component
function OverviewTab({ user, listings, matches, stats, router }: any) {
  const { t } = useTranslation()
  const { height: screenHeight } = useWindowDimensions()
  
  // Calculate active listings (assuming max 5 listings per user)
  const activeListings = listings?.filter((listing: any) => listing.status === 'active').length || 0
  const maxListings = 5
  
  // Calculate positive rating percentage (convert 4.5/5 to percentage)
  const overallRating = user?.rating || 4.5
  const positivePercentage = Math.round((overallRating / 5) * 100)
  
  // Responsive spacing based on screen height (smaller screens need more spacing)
  const isSmallScreen = screenHeight < 700
  const widgetSpacing = isSmallScreen ? spacing.xl : spacing.lg

  // Mock events data - replace with actual events from database
  const mockEvents = [
    {
      id: '1',
      title: 'Client Meeting - Website Project',
      date: new Date(2024, 11, 28), // December 28, 2024
      time: '2:00 PM',
      type: 'meeting' as const,
    },
    {
      id: '2',
      title: 'Job Interview - Marketing Role',
      date: new Date(2024, 11, 30), // December 30, 2024
      time: '10:00 AM',
      type: 'interview' as const,
    },
    {
      id: '3',
      title: 'Project Deadline - Logo Design',
      date: new Date(2025, 0, 2), // January 2, 2025
      time: '5:00 PM',
      type: 'deadline' as const,
    },
    {
      id: '4',
      title: 'Follow-up Call',
      date: new Date(2025, 0, 5), // January 5, 2025
      time: '11:30 AM',
      type: 'other' as const,
    },
  ]

  const handleNavigateToListings = () => {
    router.push('/(tabs)/offer')
  }

  const handleNavigateToRating = () => {
    // Navigate to rating/reviews page when implemented
    router.push('/(tabs)/profile')
  }

  const handleNavigateToMessages = () => {
    router.push('/(tabs)/messages')
  }

  const handleNavigateToLiked = () => {
    router.push('/(tabs)/swipe')
  }

  return (
    <View>
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <Pressable onPress={handleNavigateToListings} style={styles.statCardWrapper}>
          <View style={[styles.statCard, styles.statCardCyan]}>
            <Ionicons name="briefcase" size={28} color="#9333EA" style={styles.statIcon} />
          <Text style={styles.statValue}>{activeListings}/{maxListings}</Text>
            <Text style={styles.statLabelLink}>{t('dashboard.activeListings')}</Text>
          </View>
          </Pressable>
        
        <Pressable onPress={handleNavigateToRating} style={styles.statCardWrapper}>
          <View style={[styles.statCard, styles.statCardYellow]}>
            <Ionicons name="star" size={28} color="#FBBF24" style={styles.statIcon} />
          <View style={styles.ratingContainer}>
            <Text style={styles.statValue}>{positivePercentage}%</Text>
          </View>
            <Text style={styles.statLabelLink}>{t('dashboard.positive')}</Text>
          </View>
          </Pressable>
        
        <Pressable onPress={handleNavigateToMessages} style={styles.statCardWrapper}>
          <View style={[styles.statCard, styles.statCardPink]}>
            <Ionicons name="chatbubbles" size={28} color="#1E40AF" style={styles.statIcon} />
          <Text style={styles.statValue}>{stats.unreadMessages}</Text>
            <Text style={styles.statLabelLink}>{t('dashboard.messages')}</Text>
          </View>
          </Pressable>
        
        <Pressable onPress={handleNavigateToLiked} style={styles.statCardWrapper}>
          <View style={[styles.statCard, styles.statCardGreen]}>
            <Ionicons name="heart" size={28} color="#fe2858" style={styles.statIcon} />
          <Text style={styles.statValue}>{stats.pendingLikes}</Text>
            <Text style={styles.statLabelLink}>{t('dashboard.liked')}</Text>
          </View>
          </Pressable>
      </View>

      {/* Quick Rebooking Widget with responsive spacing */}
      {user && (
        <View style={{ marginTop: widgetSpacing }}>
          <QuickRebookingWidget userId={user.id} maxItems={3} />
        </View>
      )}

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
    backgroundColor: surfaces.background,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 16,
    color: surfaces.onSurfaceVariant,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    backgroundColor: Platform.OS === 'web' 
      ? 'rgba(255, 255, 255, 0.85)' 
      : 'transparent',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      backdropFilter: 'blur(20px)',
    } : {
      ...elevation.level2,
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
    fontWeight: '500',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: pastelColors.primary[600], // Light blue for titles
    marginTop: spacing.xs,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: pastelColors.secondary[100],
    justifyContent: 'center',
    alignItems: 'center',
    ...elevation.level1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  notificationButton: {
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: pastelColors.primary[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 4, // Increased padding to ensure logout button is fully visible
    paddingTop: spacing.lg,
    flexGrow: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCardWrapper: {
    flex: 1,
    minWidth: '45%',
  },
  statCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: surfaces.surface,
    minHeight: 140,
    justifyContent: 'center',
    ...elevation.level2,
  },
  statCardCyan: {
    // No border needed - elevation provides depth
  },
  statCardYellow: {
    // No border needed - elevation provides depth
  },
  statCardPink: {
    // No border needed - elevation provides depth
  },
  statCardGreen: {
    // No border needed - elevation provides depth
  },
  statIcon: {
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: surfaces.onSurface,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  statLabelLink: {
    fontSize: 13,
    color: pastelColors.secondary[600],
    marginTop: spacing.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starIcon: {
    marginLeft: 4,
  },
  actionButton: {
    backgroundColor: pastelColors.primary[500],
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    ...elevation.level1,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listingCard: {
    backgroundColor: surfaces.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...elevation.level2,
  },
  listingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: surfaces.onSurface,
    marginBottom: spacing.sm,
  },
  listingDescription: {
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
    lineHeight: 20,
  },
  matchCard: {
    backgroundColor: surfaces.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...elevation.level2,
  },
  matchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 40,
  },
  logoutContainer: {
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: surfaces.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 0, // Removed border
    gap: spacing.sm,
    alignSelf: 'center',
    width: '50%',
    ...elevation.level1,
  },
  logoutButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: pastelColors.error[500],
  },
})
