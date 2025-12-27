import { useState, useEffect } from 'react'
import { View, Text, Pressable, StyleSheet, Modal, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { getNotifications } from '@/lib/utils/notifications'
import { NotificationCenter } from './NotificationCenter'
import type { Notification } from '@/lib/types'

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadUnreadCount()

    // Skip WebSocket subscription on web to prevent connection issues
    if (Platform.OS === 'web') {
      return
    }

    // Subscribe to notification changes (native only)
    const channel = supabase
      .channel('notifications-bell')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          loadUnreadCount()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Connection successful
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('Channel subscription error for notifications-bell')
        }
      })

    return () => {
      supabase.removeChannel(channel).catch((err) => {
        if (__DEV__) {
          console.warn('Error removing channel:', err)
        }
      })
    }
  }, [])

  const loadUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const notifications = await getNotifications(user.id, { limit: 50 })
      const unread = notifications.filter(n => !n.is_read).length
      setUnreadCount(unread)
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  const handlePress = () => {
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    // Reload count when modal closes in case notifications were read
    loadUnreadCount()
  }

  return (
    <>
      <Pressable style={styles.bellContainer} onPress={handlePress}>
        <Ionicons 
          name={unreadCount > 0 ? "notifications" : "notifications-outline"} 
          size={24} 
          color="#1a1a1a" 
        />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount.toString()}
            </Text>
          </View>
        )}
      </Pressable>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <Pressable onPress={handleModalClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>
          <NotificationCenter />
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  bellContainer: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#f25842',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
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
  closeButton: {
    padding: 4,
  },
})