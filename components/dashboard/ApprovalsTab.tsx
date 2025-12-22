import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { approvePendingRequest, rejectPendingRequest, getPendingApprovals } from '@/lib/utils/approvals'
import type { PendingApproval, Listing, User } from '@/lib/types'
import { formatDateTime } from '@/lib/utils/date'

interface EnrichedApproval extends PendingApproval {
  listing?: Listing
  customer?: User
}

export function ApprovalsTab() {
  const router = useRouter()
  const [approvals, setApprovals] = useState<EnrichedApproval[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadApprovals()
  }, [])

  const loadApprovals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await getPendingApprovals(user.id)

      if (error || !data) {
        setLoading(false)
        return
      }

      // Enrich with listing and customer data
      const enriched = await Promise.all(
        data.map(async (approval: PendingApproval) => {
          const { data: listing } = await supabase
            .from('listings')
            .select('*')
            .eq('id', approval.listing_id)
            .single()

          const { data: customer } = await supabase
            .from('users')
            .select('*')
            .eq('id', approval.customer_id)
            .single()

          return {
            ...approval,
            listing: listing || undefined,
            customer: customer || undefined,
          }
        })
      )

      setApprovals(enriched)
    } catch (error) {
      console.error('Error loading approvals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (approvalId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setLoading(true)
    const result = await approvePendingRequest(approvalId, user.id)

    if (result.success) {
      Alert.alert('Approved', 'Match created! Start chatting.', [
        { text: 'OK', onPress: () => loadApprovals() },
        {
          text: 'View Match',
          onPress: () => result.match && router.push(`/chat/${result.match.id}`),
        },
      ])
    } else {
      Alert.alert('Error', result.error || 'Failed to approve request')
    }
    setLoading(false)
  }

  const handleReject = async (approvalId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this service request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setLoading(true)
            await rejectPendingRequest(approvalId, user.id)
            loadApprovals()
            setLoading(false)
          },
        },
      ]
    )
  }

  // Use shared date formatting utility
  const formatDate = (dateString: string) => formatDateTime(dateString)

  if (loading && approvals.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f25842" />
      </View>
    )
  }

  if (approvals.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-circle-outline" size={64} color="#9ca3af" />
        <Text style={styles.emptyTitle}>No pending approvals</Text>
        <Text style={styles.emptyText}>
          Service requests from customers will appear here
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pending Approvals</Text>
      <FlatList
        data={approvals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.approvalCard}>
            <View style={styles.approvalHeader}>
              <Text style={styles.approvalTitle}>
                {item.listing?.title || 'Service Request'}
              </Text>
              <Text style={styles.approvalTime}>
                {formatDate(item.created_at)}
              </Text>
            </View>

            {item.customer && (
              <View style={styles.customerSection}>
                <Text style={styles.customerLabel}>From:</Text>
                <Text style={styles.customerName}>{item.customer.name}</Text>
              </View>
            )}

            {item.requested_time_slot_start && (
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={16} color="#6b7280" />
                <Text style={styles.detailText}>
                  {formatDate(item.requested_time_slot_start)}
                  {item.requested_time_slot_end && ` - ${formatDate(item.requested_time_slot_end)}`}
                </Text>
              </View>
            )}

            {item.requested_price && (
              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={16} color="#6b7280" />
                <Text style={styles.detailText}>£{item.requested_price}</Text>
              </View>
            )}

            {item.customer_message && (
              <View style={styles.messageSection}>
                <Text style={styles.messageLabel}>Message:</Text>
                <Text style={styles.messageText}>{item.customer_message}</Text>
              </View>
            )}

            <View style={styles.actions}>
              <Pressable
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleReject(item.id)}
              >
                <Ionicons name="close" size={20} color="#ef4444" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleApprove(item.id)}
              >
                <Ionicons name="checkmark" size={20} color="#10b981" />
                <Text style={styles.approveButtonText}>Approve</Text>
              </Pressable>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadApprovals}
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
  listContent: {
    padding: 16,
  },
  approvalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  approvalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  approvalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  approvalTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 12,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  customerLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  messageSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  rejectButton: {
    backgroundColor: '#fee2e2',
  },
  rejectButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: '#d1fae5',
  },
  approveButtonText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
})
