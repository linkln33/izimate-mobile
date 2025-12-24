import { useState } from 'react'
import { View, Text, StyleSheet, Pressable, Alert, Modal, TextInput, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { Match, User, Listing } from '@/lib/types'

interface BookingChatActionsProps {
  match: Match
  currentUser: User
  otherUser: User
  listing: Listing
  onBookingAction?: (action: string, data?: any) => void
}

export function BookingChatActions({ 
  match, 
  currentUser, 
  otherUser, 
  listing, 
  onBookingAction 
}: BookingChatActionsProps) {
  const router = useRouter()
  const [showPriceModal, setShowPriceModal] = useState(false)
  const [showDateModal, setShowDateModal] = useState(false)
  const [proposedPrice, setProposedPrice] = useState('')
  const [proposedDate, setProposedDate] = useState('')
  const [proposedTime, setProposedTime] = useState('')
  const [loading, setLoading] = useState(false)

  const isCustomer = match.customer_id === currentUser.id
  const isProvider = match.provider_id === currentUser.id

  const handleBookNow = () => {
    if (!listing.booking_enabled) {
      Alert.alert('Booking Unavailable', 'This service is not available for online booking. Please discuss details in chat.')
      return
    }

    router.push({
      pathname: '/booking/calendar',
      params: {
        listingId: listing.id,
        providerId: match.provider_id,
        matchId: match.id,
      }
    })
  }

  const handleSendPriceProposal = async () => {
    if (!proposedPrice.trim()) {
      Alert.alert('Error', 'Please enter a price')
      return
    }

    setLoading(true)
    try {
      const price = parseFloat(proposedPrice)
      if (isNaN(price) || price <= 0) {
        Alert.alert('Error', 'Please enter a valid price')
        return
      }

      // Send price proposal message
      const { error } = await supabase
        .from('messages')
        .insert({
          match_id: match.id,
          sender_id: currentUser.id,
          recipient_id: otherUser.id,
          content: `💰 Price proposal: $${price}`,
          message_type: 'price_proposal',
          metadata: {
            price: price,
            currency: listing.currency || 'USD',
          }
        })

      if (error) throw error

      // Update match with proposed price
      await supabase
        .from('matches')
        .update({ 
          proposed_price: price,
          status: 'negotiating'
        })
        .eq('id', match.id)

      setShowPriceModal(false)
      setProposedPrice('')
      onBookingAction?.('price_proposed', { price })
      
      Alert.alert('Success', 'Price proposal sent!')
    } catch (error) {
      console.error('Error sending price proposal:', error)
      Alert.alert('Error', 'Failed to send price proposal')
    } finally {
      setLoading(false)
    }
  }

  const handleSendDateProposal = async () => {
    if (!proposedDate.trim() || !proposedTime.trim()) {
      Alert.alert('Error', 'Please enter both date and time')
      return
    }

    setLoading(true)
    try {
      const dateTime = `${proposedDate} ${proposedTime}`
      
      // Send date proposal message
      const { error } = await supabase
        .from('messages')
        .insert({
          match_id: match.id,
          sender_id: currentUser.id,
          recipient_id: otherUser.id,
          content: `📅 Date proposal: ${dateTime}`,
          message_type: 'date_proposal',
          metadata: {
            date: proposedDate,
            time: proposedTime,
            datetime: dateTime,
          }
        })

      if (error) throw error

      // Update match with proposed date
      await supabase
        .from('matches')
        .update({ 
          proposed_date: dateTime,
          status: 'negotiating'
        })
        .eq('id', match.id)

      setShowDateModal(false)
      setProposedDate('')
      setProposedTime('')
      onBookingAction?.('date_proposed', { date: dateTime })
      
      Alert.alert('Success', 'Date proposal sent!')
    } catch (error) {
      console.error('Error sending date proposal:', error)
      Alert.alert('Error', 'Failed to send date proposal')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptProposal = async (type: 'price' | 'date') => {
    setLoading(true)
    try {
      const updates: any = { status: 'negotiating' }
      
      if (type === 'price' && match.proposed_price) {
        updates.final_price = match.proposed_price
      }
      if (type === 'date' && match.proposed_date) {
        updates.final_date = match.proposed_date
      }

      await supabase
        .from('matches')
        .update(updates)
        .eq('id', match.id)

      // Send acceptance message
      const content = type === 'price' 
        ? `✅ Accepted price: $${match.proposed_price}`
        : `✅ Accepted date: ${match.proposed_date}`

      await supabase
        .from('messages')
        .insert({
          match_id: match.id,
          sender_id: currentUser.id,
          recipient_id: otherUser.id,
          content,
          message_type: 'text',
        })

      onBookingAction?.('proposal_accepted', { type })
      Alert.alert('Success', `${type === 'price' ? 'Price' : 'Date'} accepted!`)
    } catch (error) {
      console.error('Error accepting proposal:', error)
      Alert.alert('Error', 'Failed to accept proposal')
    } finally {
      setLoading(false)
    }
  }

  const handleViewBookings = () => {
    router.push('/dashboard?tab=bookings')
  }

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Need help with this booking? Our support team is here to assist you.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Email Support', onPress: () => {
          // Open email client or support form
        }},
        { text: 'Live Chat', onPress: () => {
          // Open support chat
        }}
      ]
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.actionsGrid}>
        {/* Book Now - Only for customers when booking is enabled */}
        {isCustomer && listing.booking_enabled && (
          <Pressable style={[styles.actionButton, styles.primaryButton]} onPress={handleBookNow}>
            <Ionicons name="calendar" size={20} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Book Now</Text>
          </Pressable>
        )}

        {/* Price Proposal */}
        <Pressable style={[styles.actionButton, styles.secondaryButton]} onPress={() => setShowPriceModal(true)}>
          <Ionicons name="card-outline" size={20} color="#f25842" />
          <Text style={styles.secondaryButtonText}>Propose Price</Text>
        </Pressable>

        {/* Date Proposal */}
        <Pressable style={[styles.actionButton, styles.secondaryButton]} onPress={() => setShowDateModal(true)}>
          <Ionicons name="calendar-outline" size={20} color="#f25842" />
          <Text style={styles.secondaryButtonText}>Propose Date</Text>
        </Pressable>

        {/* View Bookings */}
        <Pressable style={[styles.actionButton, styles.tertiaryButton]} onPress={handleViewBookings}>
          <Ionicons name="list-outline" size={20} color="#6b7280" />
          <Text style={styles.tertiaryButtonText}>My Bookings</Text>
        </Pressable>
      </View>

      {/* Show pending proposals */}
      {match.proposed_price && match.status === 'negotiating' && (
        <View style={styles.proposalCard}>
          <View style={styles.proposalHeader}>
            <Ionicons name="card" size={16} color="#f59e0b" />
            <Text style={styles.proposalTitle}>Price Proposal</Text>
          </View>
          <Text style={styles.proposalValue}>${match.proposed_price}</Text>
          {!isCustomer && (
            <Pressable 
              style={styles.acceptButton} 
              onPress={() => handleAcceptProposal('price')}
              disabled={loading}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </Pressable>
          )}
        </View>
      )}

      {match.proposed_date && match.status === 'negotiating' && (
        <View style={styles.proposalCard}>
          <View style={styles.proposalHeader}>
            <Ionicons name="calendar" size={16} color="#f59e0b" />
            <Text style={styles.proposalTitle}>Date Proposal</Text>
          </View>
          <Text style={styles.proposalValue}>{match.proposed_date}</Text>
          {!isCustomer && (
            <Pressable 
              style={styles.acceptButton} 
              onPress={() => handleAcceptProposal('date')}
              disabled={loading}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Price Proposal Modal */}
      <Modal
        visible={showPriceModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPriceModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Propose Price</Text>
            <Pressable onPress={() => setShowPriceModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Suggest a price for "{listing.title}"
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Price ($)</Text>
              <TextInput
                style={styles.priceInput}
                value={proposedPrice}
                onChangeText={setProposedPrice}
                placeholder="0.00"
                keyboardType="numeric"
                autoFocus
              />
            </View>
            
            <View style={styles.modalActions}>
              <Pressable 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowPriceModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={handleSendPriceProposal}
                disabled={loading}
              >
                <Text style={styles.confirmButtonText}>Send Proposal</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Date Proposal Modal */}
      <Modal
        visible={showDateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Propose Date & Time</Text>
            <Pressable onPress={() => setShowDateModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Suggest a date and time for "{listing.title}"
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.textInput}
                value={proposedDate}
                onChangeText={setProposedDate}
                placeholder="YYYY-MM-DD"
                autoFocus
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Time</Text>
              <TextInput
                style={styles.textInput}
                value={proposedTime}
                onChangeText={setProposedTime}
                placeholder="HH:MM AM/PM"
              />
            </View>
            
            <View style={styles.modalActions}>
              <Pressable 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowDateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={handleSendDateProposal}
                disabled={loading}
              >
                <Text style={styles.confirmButtonText}>Send Proposal</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    minWidth: '48%',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#f25842',
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f25842',
    flex: 1,
  },
  tertiaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f25842',
  },
  tertiaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  proposalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderLeftWidth: 4,
  },
  proposalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  proposalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  proposalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  acceptButton: {
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  acceptButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  priceInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: '#f25842',
    paddingVertical: 8,
    textAlign: 'center',
  },
  textInput: {
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  confirmButton: {
    backgroundColor: '#f25842',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
})
