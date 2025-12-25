import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, Image, Platform } from 'react-native'
import { SkeletonLoader } from '@/components/common/SkeletonLoader'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import type { Match, User, Listing, Message } from '@/lib/types'

interface EnrichedMatch extends Match {
  otherUser: User
  listing: Listing | null
  lastMessage?: {
    content: string
    created_at: string
    unread: boolean
  }
}

export default function MessagesScreen() {
  const router = useRouter()
  const [matches, setMatches] = useState<EnrichedMatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMatches()
    
    // Subscribe to new messages
    const channel = supabase
      .channel('messages-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          loadMatches()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadMatches = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.replace('/(auth)/login')
        return
      }

      // Load user's matches
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .or(`customer_id.eq.${authUser.id},provider_id.eq.${authUser.id}`)
        .order('matched_at', { ascending: false })

      if (!matchesData) {
        setLoading(false)
        return
      }

      // Enrich matches with other user, listing, and last message
      const enrichedMatches = await Promise.all(
        matchesData.map(async (match: Match) => {
          const otherUserId =
            match.customer_id === authUser.id ? match.provider_id : match.customer_id

          // Load other user
          const { data: otherUserData } = await supabase
            .from('users')
            .select('*')
            .eq('id', otherUserId)
            .single()

          // Load listing
          let listing: Listing | null = null
          if (match.listing_id) {
            const { data: listingData } = await supabase
              .from('listings')
              .select('*')
              .eq('id', match.listing_id)
              .single()
            listing = listingData as Listing | null
          }

          // Load last message
          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('*')
            .eq('match_id', match.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          const lastMessage = lastMessageData
            ? {
                content: lastMessageData.content,
                created_at: lastMessageData.created_at,
                unread:
                  !lastMessageData.read_at && lastMessageData.sender_id !== authUser.id,
              }
            : undefined

          return {
            ...match,
            otherUser: otherUserData as User,
            listing,
            lastMessage,
          }
        })
      )

      setMatches(enrichedMatches)
    } catch (error) {
      console.error('Error loading matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <SkeletonLoader type="list" count={5} />
      </View>
    )
  }

  if (matches.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="chatbubbles-outline" size={64} color="#9ca3af" />
        <Text style={styles.emptyTitle}>No messages yet</Text>
        <Text style={styles.emptyText}>
          Start swiping to find matches and begin conversations!
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.matchItem}
            onPress={() => router.push(`/chat/${item.id}`)}
          >
            <View style={styles.avatarContainer}>
              {item.otherUser.avatar_url ? (
                <Image
                  source={{ uri: item.otherUser.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={24} color="#6b7280" />
                </View>
              )}
              {item.lastMessage?.unread && <View style={styles.unreadDot} />}
            </View>
            <View style={styles.matchContent}>
              <View style={styles.matchHeader}>
                <Text style={styles.matchName} numberOfLines={1}>
                  {item.otherUser.name}
                </Text>
                {item.lastMessage && (
                  <Text style={styles.matchTime}>
                    {formatTime(item.lastMessage.created_at)}
                  </Text>
                )}
              </View>
              {item.listing && (
                <Text style={styles.matchListing} numberOfLines={1}>
                  {item.listing.title}
                </Text>
              )}
              {item.lastMessage ? (
                <Text style={styles.matchLastMessage} numberOfLines={1}>
                  {item.lastMessage.content}
                </Text>
              ) : (
                <Text style={styles.matchLastMessage} numberOfLines={1}>
                  Start the conversation...
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </Pressable>
        )}
        contentContainerStyle={styles.listContent}
      />
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
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  listContent: {
    padding: 16,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f25842',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  matchContent: {
    flex: 1,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  matchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  matchTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
  },
  matchListing: {
    fontSize: 14,
    color: '#f25842',
    fontWeight: '500',
    marginBottom: 4,
  },
  matchLastMessage: {
    fontSize: 14,
    color: '#6b7280',
  },
})
