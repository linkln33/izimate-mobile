import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SkeletonLoader } from '@/components/common/SkeletonLoader'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
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
import { colors, spacing, elevation, borderRadius } from '@/lib/design-system'

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

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Reload user data when screen comes into focus (e.g., after currency change)
  useFocusEffect(
    useCallback(() => {
      // Only reload user data, not all dashboard data
      const reloadUser = async () => {
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
      let pendingLikesCount = 0
      if (listingsData && listingsData.length > 0) {
        const listingIds = listingsData.map(l => l.id)
        const { count } = await supabase
          .from('swipes')
          .select('*', { count: 'exact', head: true })
          .eq('swipe_type', 'customer_on_listing')
          .eq('direction', 'right')
          .in('listing_id', listingIds)
          .is('approved', null)
        pendingLikesCount = count || 0
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
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#f25842', '#ff6b55', '#ff8a7a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
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
              <Ionicons name="settings-outline" size={24} color="#ffffff" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      {/* Scrollable Dashboard with Collapsible Sections */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={true}
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
          title={t('dashboard.affiliate')}
          icon="people"
          iconColor="#8b5cf6"
          defaultExpanded={params.section === 'affiliate'}
        >
          <AffiliateTab user={user} />
        </CollapsibleSection>

        {/* Verification Section */}
        <CollapsibleSection
          title={t('dashboard.verification')}
          icon="shield-checkmark"
          iconColor="#f59e0b"
        >
          <VerificationTab user={user} />
        </CollapsibleSection>

        {/* My Bookings Section - Customer bookings */}
        {user && (
        <CollapsibleSection
            title="My Bookings"
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
            title="Business"
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
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
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
  // Calculate active listings (assuming max 5 listings per user)
  const activeListings = listings?.filter((listing: any) => listing.status === 'active').length || 0
  const maxListings = 5
  
  // Calculate positive rating percentage (convert 4.5/5 to percentage)
  const overallRating = user?.rating || 4.5
  const positivePercentage = Math.round((overallRating / 5) * 100)

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
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <Ionicons name="briefcase-outline" size={28} color="#ffffff" style={styles.statIcon} />
            <Text style={styles.statValue}>{activeListings}/{maxListings}</Text>
            <Text style={styles.statLabelLink}>{t('dashboard.activeListings')}</Text>
          </LinearGradient>
        </Pressable>
        
        <Pressable onPress={handleNavigateToRating} style={styles.statCardWrapper}>
          <LinearGradient
            colors={['#f59e0b', '#d97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <Ionicons name="star" size={28} color="#ffffff" style={styles.statIcon} />
            <View style={styles.ratingContainer}>
              <Text style={styles.statValue}>{positivePercentage}%</Text>
            </View>
            <Text style={styles.statLabelLink}>{t('dashboard.positive')}</Text>
          </LinearGradient>
        </Pressable>
        
        <Pressable onPress={handleNavigateToMessages} style={styles.statCardWrapper}>
          <LinearGradient
            colors={['#10b981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <Ionicons name="chatbubbles-outline" size={28} color="#ffffff" style={styles.statIcon} />
            <Text style={styles.statValue}>{stats.unreadMessages}</Text>
            <Text style={styles.statLabelLink}>{t('dashboard.messages')}</Text>
          </LinearGradient>
        </Pressable>
        
        <Pressable onPress={handleNavigateToLiked} style={styles.statCardWrapper}>
          <LinearGradient
            colors={['#8b5cf6', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
          >
            <Ionicons name="heart-outline" size={28} color="#ffffff" style={styles.statIcon} />
            <Text style={styles.statValue}>{stats.pendingLikes}</Text>
            <Text style={styles.statLabelLink}>{t('dashboard.liked')}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Quick Rebooking Widget */}
      {user && (
        <QuickRebookingWidget userId={user.id} maxItems={3} />
      )}

    </View>
  )
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    ...elevation.level2,
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
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: spacing.xs,
    ...(Platform.OS === 'web' ? {
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    } : {
      textShadowColor: 'rgba(0, 0, 0, 0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    }),
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#f25842',
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
    paddingBottom: spacing.xl * 2,
    paddingTop: spacing.lg,
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
    ...(Platform.OS === 'web' ? {
      boxShadow: `0 4px 8px rgba(0, 0, 0, 0.12)`,
    } : {
      shadowColor: elevation.level3.shadowColor,
      shadowOffset: elevation.level3.shadowOffset,
      shadowOpacity: elevation.level3.shadowOpacity,
      shadowRadius: elevation.level3.shadowRadius,
      elevation: elevation.level3.elevation,
    }),
    minHeight: 140,
    justifyContent: 'center',
  },
  statIcon: {
    marginBottom: spacing.sm,
    opacity: 0.9,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: spacing.xs,
    ...(Platform.OS === 'web' ? {
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
    } : {
      textShadowColor: 'rgba(0, 0, 0, 0.2)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    }),
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  statLabelLink: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
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
    backgroundColor: '#f25842',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  listingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  listingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  listingDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  matchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.error,
    gap: spacing.sm,
    ...elevation.level1,
  },
  logoutButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
})
