import { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/utils/images'
import { BookingChatActions } from '@/components/chat/BookingChatActions'
import { BookingMessageBubble } from '@/components/chat/BookingMessageBubble'
import type { Match, User, Listing, Message } from '@/lib/types'
import { formatTime } from '@/lib/utils/date'

export default function ChatScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const matchId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [match, setMatch] = useState<Match | null>(null)
  const [listing, setListing] = useState<Listing | null>(null)
  const [otherUser, setOtherUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [proposalLoading, setProposalLoading] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    loadChat()
    
    // Subscribe to new messages
    const channel = supabase
      .channel(`match_${matchId}`)
        .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message
          setMessages((prev) => [...prev, newMessage])
          await markAsRead(newMessage)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId])

  const loadChat = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.replace('/(auth)/login')
        return
      }

      // Load user profile
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (userData) {
        setUser(userData)
      }

      // Load match
      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (!matchData) {
        router.back()
        return
      }

      setMatch(matchData)

      // Load listing
      if (matchData.listing_id) {
        const { data: listingData } = await supabase
          .from('listings')
          .select('*')
          .eq('id', matchData.listing_id)
          .single()

        if (listingData) {
          setListing(listingData)
        }
      }

      // Load other user
      const otherUserId =
        matchData.customer_id === authUser.id
          ? matchData.provider_id
          : matchData.customer_id

      const { data: otherUserData } = await supabase
        .from('users')
        .select('*')
        .eq('id', otherUserId)
        .single()

      if (otherUserData) {
        setOtherUser(otherUserData)
      }

      // Load messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true })

      if (messagesData) {
        setMessages(messagesData as Message[])
        // Mark messages as read
        await markMessagesAsRead(messagesData as Message[], authUser.id)
      }
    } catch (error) {
      console.error('Error loading chat:', error)
      Alert.alert('Error', 'Failed to load chat')
    } finally {
      setLoading(false)
    }
  }

  const markMessagesAsRead = async (messages: Message[], userId: string) => {
    const unreadMessages = messages.filter(
      (m) => !m.read_at && m.sender_id !== userId
    )

    if (unreadMessages.length > 0) {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in(
          'id',
          unreadMessages.map((m) => m.id)
        )
    }
  }

  const markAsRead = async (message: Message) => {
    if (!user || message.read_at || message.sender_id === user.id) return

    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', message.id)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !match || sending) return

    setSending(true)
    try {
      const { error } = await supabase.from('messages').insert({
        match_id: matchId,
        sender_id: user.id,
        content: newMessage.trim(),
        message_type: 'text',
      })

      if (error) {
        Alert.alert('Error', 'Failed to send message')
        return
      }

      setNewMessage('')
    } catch (error) {
      Alert.alert('Error', 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleAcceptProposal = async (messageId: string, type: 'price' | 'date') => {
    if (!user || !match || proposalLoading) return

    setProposalLoading(true)
    try {
      // Find the message with the proposal
      const proposalMessage = messages.find(m => m.id === messageId)
      if (!proposalMessage || !proposalMessage.metadata) return

      const updates: any = { status: 'negotiating' }
      
      if (type === 'price') {
        updates.final_price = proposalMessage.metadata.price
      } else if (type === 'date') {
        updates.final_date = proposalMessage.metadata.datetime
      }

      // Update match
      await supabase
        .from('matches')
        .update(updates)
        .eq('id', match.id)

      // Send acceptance message
      const content = type === 'price' 
        ? `✅ Accepted price: $${proposalMessage.metadata.price}`
        : `✅ Accepted date: ${proposalMessage.metadata.datetime}`

      await supabase
        .from('messages')
        .insert({
          match_id: matchId,
          sender_id: user.id,
          recipient_id: otherUser?.id,
          content,
          message_type: 'text',
        })

      Alert.alert('Success', `${type === 'price' ? 'Price' : 'Date'} accepted!`)
    } catch (error) {
      console.error('Error accepting proposal:', error)
      Alert.alert('Error', 'Failed to accept proposal')
    } finally {
      setProposalLoading(false)
    }
  }

  const handleDeclineProposal = async (messageId: string, type: 'price' | 'date') => {
    if (!user || !match || proposalLoading) return

    setProposalLoading(true)
    try {
      // Send decline message
      const content = type === 'price' 
        ? '❌ Declined price proposal'
        : '❌ Declined date proposal'

      await supabase
        .from('messages')
        .insert({
          match_id: matchId,
          sender_id: user.id,
          recipient_id: otherUser?.id,
          content,
          message_type: 'text',
        })

      Alert.alert('Declined', `${type === 'price' ? 'Price' : 'Date'} proposal declined`)
    } catch (error) {
      console.error('Error declining proposal:', error)
      Alert.alert('Error', 'Failed to decline proposal')
    } finally {
      setProposalLoading(false)
    }
  }

  const handleBookingAction = (action: string, data?: any) => {
    // Handle booking-related actions from BookingChatActions
    switch (action) {
      case 'price_proposed':
        // Refresh messages to show the new proposal
        loadChat()
        break
      case 'date_proposed':
        // Refresh messages to show the new proposal
        loadChat()
        break
      case 'proposal_accepted':
        // Refresh match data
        loadChat()
        break
    }
  }

  const handleSendImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to photos')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      })

      if (result.canceled || !result.assets || !user || !match) return

      setUploadingImage(true)
      const imageUri = result.assets[0].uri

      // Upload image
      const imageUrl = await uploadImage(imageUri, 'messages')

      // Send message with image
      await supabase.from('messages').insert({
        match_id: matchId,
        sender_id: user.id,
        content: 'Sent an image',
        message_type: 'image',
        metadata: { image_url: imageUrl },
      })
    } catch (error) {
      Alert.alert('Error', 'Failed to send image')
    } finally {
      setUploadingImage(false)
    }
  }

  // formatTime is imported from shared utility above

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f25842" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </Pressable>
        <View style={styles.headerContent}>
          {otherUser?.avatar_url ? (
            <Image
              source={{ uri: otherUser.avatar_url }}
              style={styles.headerAvatar}
            />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Ionicons name="person" size={20} color="#6b7280" />
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerName}>{otherUser?.name || 'User'}</Text>
            {listing && (
              <Text style={styles.headerListing} numberOfLines={1}>
                {listing.title}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isOwn = item.sender_id === user?.id
          return (
            <BookingMessageBubble
              message={item}
              isOwn={isOwn}
              onAcceptProposal={handleAcceptProposal}
              onDeclineProposal={handleDeclineProposal}
            />
          )
        }}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Booking Actions */}
      {match && user && otherUser && listing && (
        <BookingChatActions
          match={match}
          currentUser={user}
          otherUser={otherUser}
          listing={listing}
          onBookingAction={handleBookingAction}
        />
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <Pressable
          style={styles.attachButton}
          onPress={handleSendImage}
          disabled={uploadingImage}
        >
          {uploadingImage ? (
            <ActivityIndicator size="small" color="#6b7280" />
          ) : (
            <Ionicons name="attach" size={24} color="#6b7280" />
          )}
        </Pressable>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="send" size={20} color="#ffffff" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerListing: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  messagesContent: {
    padding: 16,
  },
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  attachButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1a1a1a',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f25842',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
})
