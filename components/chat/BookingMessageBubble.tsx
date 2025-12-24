import { View, Text, StyleSheet, Pressable, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Message } from '@/lib/types'

interface BookingMessageBubbleProps {
  message: Message
  isOwn: boolean
  onAcceptProposal?: (messageId: string, type: 'price' | 'date') => void
  onDeclineProposal?: (messageId: string, type: 'price' | 'date') => void
}

export function BookingMessageBubble({ 
  message, 
  isOwn, 
  onAcceptProposal, 
  onDeclineProposal 
}: BookingMessageBubbleProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const renderPriceProposal = () => {
    const price = message.metadata?.price
    const currency = message.metadata?.currency || '$'

    return (
      <View style={[styles.proposalContainer, isOwn ? styles.proposalOwn : styles.proposalOther]}>
        <View style={styles.proposalHeader}>
          <Ionicons name="card" size={16} color="#f59e0b" />
          <Text style={styles.proposalType}>Price Proposal</Text>
        </View>
        
        <Text style={styles.proposalValue}>
          {currency}{price}
        </Text>
        
        <Text style={styles.proposalDescription}>
          {isOwn ? 'You proposed this price' : 'Price proposal from provider'}
        </Text>

        {!isOwn && (
          <View style={styles.proposalActions}>
            <Pressable 
              style={[styles.proposalButton, styles.declineButton]}
              onPress={() => onDeclineProposal?.(message.id, 'price')}
            >
              <Ionicons name="close" size={16} color="#ef4444" />
              <Text style={styles.declineButtonText}>Decline</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.proposalButton, styles.acceptButton]}
              onPress={() => onAcceptProposal?.(message.id, 'price')}
            >
              <Ionicons name="checkmark" size={16} color="#ffffff" />
              <Text style={styles.acceptButtonText}>Accept</Text>
            </Pressable>
          </View>
        )}
      </View>
    )
  }

  const renderDateProposal = () => {
    const date = message.metadata?.date
    const time = message.metadata?.time
    const datetime = message.metadata?.datetime

    return (
      <View style={[styles.proposalContainer, isOwn ? styles.proposalOwn : styles.proposalOther]}>
        <View style={styles.proposalHeader}>
          <Ionicons name="calendar" size={16} color="#3b82f6" />
          <Text style={styles.proposalType}>Date & Time Proposal</Text>
        </View>
        
        <View style={styles.dateTimeContainer}>
          <View style={styles.dateTimeItem}>
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text style={styles.dateText}>{date}</Text>
          </View>
          <View style={styles.dateTimeItem}>
            <Ionicons name="time-outline" size={14} color="#6b7280" />
            <Text style={styles.timeText}>{time}</Text>
          </View>
        </View>
        
        <Text style={styles.proposalDescription}>
          {isOwn ? 'You proposed this time' : 'Time proposal from provider'}
        </Text>

        {!isOwn && (
          <View style={styles.proposalActions}>
            <Pressable 
              style={[styles.proposalButton, styles.declineButton]}
              onPress={() => onDeclineProposal?.(message.id, 'date')}
            >
              <Ionicons name="close" size={16} color="#ef4444" />
              <Text style={styles.declineButtonText}>Decline</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.proposalButton, styles.acceptButton]}
              onPress={() => onAcceptProposal?.(message.id, 'date')}
            >
              <Ionicons name="checkmark" size={16} color="#ffffff" />
              <Text style={styles.acceptButtonText}>Accept</Text>
            </Pressable>
          </View>
        )}
      </View>
    )
  }

  const renderBookingConfirmation = () => {
    const bookingId = message.metadata?.bookingId
    const serviceName = message.metadata?.serviceName
    const bookingDate = message.metadata?.bookingDate

    return (
      <View style={[styles.confirmationContainer, isOwn ? styles.confirmationOwn : styles.confirmationOther]}>
        <View style={styles.confirmationHeader}>
          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
          <Text style={styles.confirmationType}>Booking Confirmed</Text>
        </View>
        
        {serviceName && (
          <Text style={styles.confirmationService}>{serviceName}</Text>
        )}
        
        {bookingDate && (
          <Text style={styles.confirmationDate}>
            {new Date(bookingDate).toLocaleDateString()} at {new Date(bookingDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
        
        <Text style={styles.confirmationDescription}>
          Your booking has been confirmed! You'll receive reminders before the appointment.
        </Text>
      </View>
    )
  }

  const renderSystemMessage = () => {
    return (
      <View style={styles.systemMessageContainer}>
        <View style={styles.systemMessageContent}>
          <Ionicons name="information-circle" size={16} color="#6b7280" />
          <Text style={styles.systemMessageText}>{message.content}</Text>
        </View>
      </View>
    )
  }

  // Handle different message types
  switch (message.message_type) {
    case 'price_proposal':
      return renderPriceProposal()
    case 'date_proposal':
      return renderDateProposal()
    case 'booking_confirmation':
      return renderBookingConfirmation()
    case 'system':
      return renderSystemMessage()
    case 'image':
      return (
        <View style={[styles.messageContainer, isOwn ? styles.messageOwn : styles.messageOther]}>
          {message.metadata?.image_url && (
            <Image 
              source={{ uri: message.metadata.image_url }} 
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}
          {message.content && (
            <Text style={[styles.messageText, isOwn ? styles.messageTextOwn : styles.messageTextOther]}>
              {message.content}
            </Text>
          )}
          <Text style={[styles.messageTime, isOwn ? styles.messageTimeOwn : styles.messageTimeOther]}>
            {formatTime(message.created_at)}
          </Text>
        </View>
      )
    default:
      // Regular text message
      return (
        <View style={[styles.messageContainer, isOwn ? styles.messageOwn : styles.messageOther]}>
          <Text style={[styles.messageText, isOwn ? styles.messageTextOwn : styles.messageTextOther]}>
            {message.content}
          </Text>
          <Text style={[styles.messageTime, isOwn ? styles.messageTimeOwn : styles.messageTimeOther]}>
            {formatTime(message.created_at)}
          </Text>
        </View>
      )
  }
}

const styles = StyleSheet.create({
  messageContainer: {
    maxWidth: '75%',
    marginBottom: 12,
    borderRadius: 16,
    padding: 12,
  },
  messageOwn: {
    alignSelf: 'flex-end',
    backgroundColor: '#f25842',
  },
  messageOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#ffffff',
  },
  messageTextOther: {
    color: '#1a1a1a',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  messageTimeOwn: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  messageTimeOther: {
    color: '#9ca3af',
  },
  
  // Proposal styles
  proposalContainer: {
    maxWidth: '85%',
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  proposalOwn: {
    alignSelf: 'flex-end',
    borderLeftWidth: 4,
    borderLeftColor: '#f25842',
  },
  proposalOther: {
    alignSelf: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  proposalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  proposalType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  proposalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  proposalDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  proposalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  proposalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    flex: 1,
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  declineButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  acceptButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  declineButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  
  // Date/Time styles
  dateTimeContainer: {
    gap: 8,
    marginBottom: 8,
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  
  // Confirmation styles
  confirmationContainer: {
    maxWidth: '85%',
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  confirmationOwn: {
    alignSelf: 'flex-end',
  },
  confirmationOther: {
    alignSelf: 'flex-start',
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  confirmationType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  confirmationService: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  confirmationDate: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  confirmationDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  
  // System message styles
  systemMessageContainer: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  systemMessageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  systemMessageText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
})
