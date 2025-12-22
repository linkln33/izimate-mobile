import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, RefreshControl } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { getUnreadNotificationCount } from '@/lib/utils/notifications'
import { ListingsTab } from '@/components/dashboard/ListingsTab'
import { LikedTab } from '@/components/dashboard/LikedTab'
import { ApprovalsTab } from '@/components/dashboard/ApprovalsTab'
import { BillingTab } from '@/components/dashboard/BillingTab'
import { AffiliateTab } from '@/components/dashboard/AffiliateTab'
import { VerificationTab } from '@/components/dashboard/VerificationTab'
import { SettingsTab } from '@/components/dashboard/SettingsTab'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { CollapsibleSection } from '@/components/dashboard/CollapsibleSection'
import type { Listing, Match, User } from '@/lib/types'

interface DashboardStats {
  totalListings: number
  activeMatches: number
  unreadMessages: number
  pendingLikes: number
  pendingApprovals: number
  unreadNotifications: number
}


export default function DashboardScreen() {
  const router = useRouter()
  
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
        <ActivityIndicator size="large" color="#f25842" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push('/(tabs)/profile')}>
            <Ionicons name="settings-outline" size={24} color="#6b7280" />
          </Pressable>
        </View>
      </View>

      {/* Scrollable Dashboard with Collapsible Sections */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={true}
      >
        {/* Overview Section - Always expanded by default */}
        <CollapsibleSection
          title="Overview"
          icon="home"
          defaultExpanded={true}
        >
          <OverviewTab
            user={user}
            listings={listings}
            matches={matches}
            stats={stats}
            onNavigate={() => {}}
          />
        </CollapsibleSection>

        {/* Listings Section */}
        <CollapsibleSection
          title="My Listings"
          icon="briefcase"
          badge={stats.pendingLikes}
        >
          <ListingsTab
            listings={listings}
            onRefresh={loadDashboardData}
            onNavigate={() => {}}
          />
        </CollapsibleSection>

        {/* Messages Section */}
        <CollapsibleSection
          title="Messages"
          icon="chatbubbles"
          badge={stats.unreadMessages}
        >
          <MessagesTab
            matches={matches}
            onNavigate={(matchId: string) => router.push(`/chat/${matchId}`)}
          />
        </CollapsibleSection>

        {/* Approvals Section */}
        <CollapsibleSection
          title="Pending Approvals"
          icon="checkmark-circle"
          badge={stats.pendingApprovals}
        >
          <ApprovalsTab />
        </CollapsibleSection>

        {/* Liked Listings Section */}
        <CollapsibleSection
          title="Liked Listings"
          icon="heart"
        >
          <LikedTab />
        </CollapsibleSection>

        {/* Notifications Section */}
        <CollapsibleSection
          title="Notifications"
          icon="notifications"
          badge={stats.unreadNotifications}
        >
          <NotificationCenter />
        </CollapsibleSection>

        {/* Billing Section */}
        <CollapsibleSection
          title="Billing & Subscription"
          icon="card"
        >
          <BillingTab user={user} />
        </CollapsibleSection>

        {/* Affiliate Section */}
        <CollapsibleSection
          title="Affiliate Program"
          icon="people"
        >
          <AffiliateTab user={user} />
        </CollapsibleSection>

        {/* Verification Section */}
        <CollapsibleSection
          title="Verification"
          icon="shield-checkmark"
        >
          <VerificationTab user={user} />
        </CollapsibleSection>

        {/* Settings Section */}
        <CollapsibleSection
          title="Settings"
          icon="settings"
        >
          <SettingsTab user={user} onUserUpdate={setUser} />
        </CollapsibleSection>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  )
}

// Overview Tab Component
function OverviewTab({ user, listings, matches, stats, onNavigate }: any) {
  return (
    <View>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalListings}</Text>
          <Text style={styles.statLabel}>Listings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.activeMatches}</Text>
          <Text style={styles.statLabel}>Matches</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.unreadMessages}</Text>
          <Text style={styles.statLabel}>Messages</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.pendingLikes + stats.pendingApprovals}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>
    </View>
  )
}

// MessagesTab - simple component for dashboard messages list
function MessagesTab({ matches, onNavigate }: { matches: Match[]; onNavigate: (matchId: string) => void }) {
  return (
    <View>
      {matches.length === 0 ? (
        <Text style={styles.emptyText}>No messages yet</Text>
      ) : (
        matches.map((match: Match) => (
          <Pressable
            key={match.id}
            style={styles.matchCard}
            onPress={() => onNavigate(match.id)}
          >
            <Text style={styles.matchTitle}>Match #{match.id.slice(0, 8)}</Text>
          </Pressable>
        ))
      )}
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
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  greeting: {
    fontSize: 16,
    color: '#6b7280',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 4,
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
    padding: 16,
    paddingBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
})
