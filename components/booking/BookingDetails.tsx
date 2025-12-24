import React from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { formatDate, formatTime } from '@/lib/utils/date'
import { formatCurrency } from '@/lib/utils/currency'
import { CancellationPolicyDisplay } from './CancellationPolicyDisplay'
import { PriceBreakdown } from './PriceBreakdown'
import { TrustSignals } from './TrustSignals'
import type { Booking, Listing, User } from '@/lib/types'
import type { ServiceSettings } from '@/lib/utils/slot-calculator'

interface BookingDetailsProps {
  booking: Booking
  listing: Listing
  provider: User | null
  customer: User | null
  serviceSettings?: ServiceSettings | null
  currentUserId: string
  onCancel?: () => void
  onReschedule?: () => void
  onContact?: () => void
  onRate?: () => void
}

export function BookingDetails({
  booking,
  listing,
  provider,
  customer,
  serviceSettings,
  currentUserId,
  onCancel,
  onReschedule,
  onContact,
  onRate,
}: BookingDetailsProps) {
  const router = useRouter()
  const isProvider = provider?.id === currentUserId
  const isCustomer = booking.customer_id === currentUserId
  const otherParty = isProvider ? customer : provider

  const handleCancelBooking = async () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', booking.id)

              if (error) throw error

              Alert.alert('Success', 'Booking has been cancelled')
              onCancel?.()
            } catch (error) {
              console.error('Error cancelling booking:', error)
              Alert.alert('Error', 'Failed to cancel booking')
            }
          },
        },
      ]
    )
  }

  const handleContactPress = () => {
    if (otherParty) {
      router.push(`/chat/${otherParty.id}`)
    }
    onContact?.()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10b981'
      case 'pending':
        return '#f59e0b'
      case 'cancelled':
        return '#ef4444'
      case 'completed':
        return '#3b82f6'
      default:
        return '#6b7280'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'checkmark-circle'
      case 'pending':
        return 'time'
      case 'cancelled':
        return 'close-circle'
      case 'completed':
        return 'checkmark-done-circle'
      default:
        return 'help-circle'
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </Pressable>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.statusSection}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(booking.status)}20` },
            ]}
          >
            <Ionicons
              name={getStatusIcon(booking.status)}
              size={16}
              color={getStatusColor(booking.status)}
            />
            <Text
              style={[styles.statusText, { color: getStatusColor(booking.status) }]}
            >
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
          <Text style={styles.bookingId}>Booking #{booking.id.slice(0, 8)}</Text>
        </View>

        {/* Service Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Information</Text>
          <View style={styles.serviceCard}>
            <Text style={styles.serviceName}>{booking.service_name || listing.title}</Text>
            <Text style={styles.listingTitle}>{listing.title}</Text>
            {listing.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{listing.category}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date & Time</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              <Text style={styles.infoText}>
                {formatDate(booking.start_time)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#6b7280" />
              <Text style={styles.infoText}>
                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
              </Text>
            </View>
            {booking.timezone && (
              <View style={styles.infoRow}>
                <Ionicons name="globe-outline" size={20} color="#6b7280" />
                <Text style={styles.infoText}>{booking.timezone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Provider/Customer Info */}
        {otherParty && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isProvider ? 'Customer' : 'Provider'}
            </Text>
            <View style={styles.partyCard}>
              {otherParty.avatar_url ? (
                <Image
                  source={{ uri: otherParty.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={24} color="#9ca3af" />
                </View>
              )}
              <View style={styles.partyInfo}>
                <Text style={styles.partyName}>{otherParty.name}</Text>
                {!isProvider && provider && (
                  <TrustSignals provider={provider} />
                )}
              </View>
            </View>
          </View>
        )}

        {/* Service Address - Where service should be performed */}
        {booking.service_address && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Address</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="location" size={20} color="#f25842" />
                <Text style={styles.infoText}>{booking.service_address}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Listing Location - Provider's location (if different from service address) */}
        {listing.location_address && !booking.service_address && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color="#6b7280" />
                <Text style={styles.infoText}>{listing.location_address}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Price Breakdown */}
        <View style={styles.section}>
          <PriceBreakdown booking={booking} listing={listing} />
        </View>

        {/* Cancellation Policy */}
        <View style={styles.section}>
          <CancellationPolicyDisplay
            listing={listing}
            bookingStartTime={booking.start_time}
            serviceSettings={serviceSettings}
          />
        </View>

        {/* Notes */}
        {(booking.customer_notes || booking.provider_notes) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesCard}>
              {booking.customer_notes && (
                <View style={styles.noteItem}>
                  <Text style={styles.noteLabel}>Customer Notes:</Text>
                  <Text style={styles.noteText}>{booking.customer_notes}</Text>
                </View>
              )}
              {booking.provider_notes && (
                <View style={styles.noteItem}>
                  <Text style={styles.noteLabel}>Provider Notes:</Text>
                  <Text style={styles.noteText}>{booking.provider_notes}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.timelineCard}>
            <View style={styles.timelineItem}>
              <Ionicons name="create-outline" size={16} color="#6b7280" />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Created</Text>
                <Text style={styles.timelineDate}>
                  {formatDate(booking.created_at)} at {formatTime(booking.created_at)}
                </Text>
              </View>
            </View>
            {booking.updated_at !== booking.created_at && (
              <View style={styles.timelineItem}>
                <Ionicons name="refresh-outline" size={16} color="#6b7280" />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>Last Updated</Text>
                  <Text style={styles.timelineDate}>
                    {formatDate(booking.updated_at)} at {formatTime(booking.updated_at)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        {(booking.status === 'pending' || booking.status === 'confirmed') && (
          <>
            <Pressable
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancelBooking}
            >
              <Ionicons name="close-circle" size={20} color="#ef4444" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.primaryButton]}
              onPress={onReschedule}
            >
              <Ionicons name="calendar" size={20} color="#ffffff" />
              <Text style={styles.primaryButtonText}>Reschedule</Text>
            </Pressable>
          </>
        )}
        {otherParty && (
          <Pressable
            style={[styles.actionButton, styles.contactButton]}
            onPress={handleContactPress}
          >
            <Ionicons name="chatbubble" size={20} color="#3b82f6" />
            <Text style={styles.contactButtonText}>Contact</Text>
          </Pressable>
        )}
        {booking.status === 'completed' && isCustomer && (
          <Pressable
            style={[styles.actionButton, styles.rateButton]}
            onPress={onRate}
          >
            <Ionicons name="star" size={20} color="#fbbf24" />
            <Text style={styles.rateButtonText}>Rate & Review</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  statusSection: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bookingId: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  serviceCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  listingTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4338ca',
  },
  infoCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  partyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyInfo: {
    flex: 1,
  },
  partyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  notesCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  noteItem: {
    gap: 4,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  noteText: {
    fontSize: 14,
    color: '#374151',
  },
  timelineCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 14,
    color: '#374151',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: '#fee2e2',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  primaryButton: {
    backgroundColor: '#f25842',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  contactButton: {
    backgroundColor: '#dbeafe',
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  rateButton: {
    backgroundColor: '#fef3c7',
  },
  rateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
})

