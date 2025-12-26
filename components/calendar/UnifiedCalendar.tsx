/**
 * UnifiedCalendar Component
 * Main orchestrator that combines all calendar features into one unified component
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { slotCalculator } from '@/lib/utils/slot-calculator'
import { CalendarGrid } from './CalendarGrid'
import { TimeSlotSelector } from './TimeSlotSelector'
import { ServiceSelector } from './ServiceSelector'
import { BookingForm } from './BookingForm'
import { EventDisplay } from './EventDisplay'
import { CalendarStats } from './CalendarStats'
import { ExternalCalendarSync } from './ExternalCalendarSync'
import { QuickEventForm } from '../booking/QuickEventForm'
import type {
  UnifiedCalendarProps,
  CalendarViewMode,
  CalendarEvent,
  BookingSelection,
  ServiceOption,
  TimeSlot,
  RecurringPattern,
} from './types'
import type { Listing, User, Booking } from '@/lib/types'

export const UnifiedCalendar: React.FC<UnifiedCalendarProps> = ({
  mode,
  listingId,
  listing,
  provider,
  userId,
  viewType = 'both',
  onBookingSelect,
  onBookingComplete,
  showTimeSlots = true,
  showServiceSelection = true,
  allowBookingCreation = false,
  showExternalSync = false,
  showStats = false,
  showRecurring = false,
  showEventDots = true,
  defaultViewMode = 'month',
  availableViewModes = ['month', 'week', 'day', 'list'],
  utility = 'getAvailableTimeSlots',
  onDateSelect,
  onEventPress,
  onClose,
  visible = undefined, // Default undefined for CollapsibleSection usage
  initialDate,
}) => {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(initialDate || new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    initialDate || null
  )
  const [viewMode, setViewMode] = useState<CalendarViewMode>(defaultViewMode)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [showQuickEventForm, setShowQuickEventForm] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [showDayDetailModal, setShowDayDetailModal] = useState(false)
  const [selectedDayBookings, setSelectedDayBookings] = useState<CalendarEvent[]>([])
  const [userCurrency, setUserCurrency] = useState<string | null>(null)

  useEffect(() => {
    loadUser()
    if (mode === 'viewing' || mode === 'management') {
      loadBookings()
    }
  }, [userId, mode])

  useEffect(() => {
    if (mode === 'viewing' || mode === 'management') {
      loadBookings()
    }
  }, [currentDate])

  // Reload user currency when screen comes into focus (e.g., after currency change)
  useFocusEffect(
    useCallback(() => {
      loadUser()
    }, [userId])
  )

  const loadUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        if (userData) {
          setCurrentUser(userData as User)
          setUserCurrency(userData.currency)
        }
      }
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const loadBookings = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const allBookings: CalendarEvent[] = []

      // Load customer bookings
      if (viewType === 'customer' || viewType === 'both') {
        const { data: customerBookings } = await supabase
          .from('bookings')
          .select(`
            *,
            listing:listings(title, user_id),
            provider:provider_profiles!provider_id(user:users!user_id(name, avatar_url))
          `)
          .eq('customer_id', userId)
          .gte('start_time', startOfMonth.toISOString())
          .lte('start_time', endOfMonth.toISOString())
          .not('status', 'eq', 'cancelled')
          .order('start_time', { ascending: true })

        customerBookings?.forEach(booking => {
          allBookings.push({
            id: booking.id,
            title: booking.service_name || booking.listing?.title || 'Service',
            start: new Date(booking.start_time),
            end: new Date(booking.end_time),
            status: booking.status,
            provider: booking.provider?.customer?.name || 'Provider',
            price: booking.service_price,
            currency: booking.currency,
            color: booking.status === 'confirmed' ? '#10b981' :
                   booking.status === 'pending' ? '#f59e0b' :
                   booking.status === 'completed' ? '#6366f1' : '#6b7280',
          })
        })
      }

      // Load provider bookings
      if (viewType === 'provider' || viewType === 'both') {
        // First get provider profile ID
        const { data: providerProfile } = await supabase
          .from('provider_profiles')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (providerProfile) {
          const { data: providerBookings } = await supabase
            .from('bookings')
            .select(`
              *,
              listing:listings(title),
              customer:users!bookings_customer_id_fkey(name, avatar_url)
            `)
            .eq('provider_id', providerProfile.id)
            .gte('start_time', startOfMonth.toISOString())
            .lte('start_time', endOfMonth.toISOString())
            .not('status', 'eq', 'cancelled')
            .order('start_time', { ascending: true })

          providerBookings?.forEach(booking => {
            allBookings.push({
              id: booking.id,
              title: booking.service_name || booking.listing?.title || 'Service',
              start: new Date(booking.start_time),
              end: new Date(booking.end_time),
              status: booking.status,
              customer: booking.customer?.name || 'Customer',
              price: booking.service_price,
              currency: booking.currency,
              color: booking.status === 'confirmed' ? '#10b981' :
                     booking.status === 'pending' ? '#f59e0b' :
                     booking.status === 'completed' ? '#6366f1' : '#6b7280',
            })
          })
        }
      }

      allBookings.sort((a, b) => a.start.getTime() - b.start.getTime())
      setEvents(allBookings)
    } catch (error) {
      console.error('Error loading bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    onDateSelect?.(date)

    // In booking mode, clear slot selection when date changes
    if (mode === 'booking') {
      setSelectedSlot(null)
    }

    // In viewing/management mode, if day has bookings, show detail modal
    if ((mode === 'viewing' || mode === 'management') && events.length > 0) {
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.start)
        return (
          eventDate.getFullYear() === date.getFullYear() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getDate() === date.getDate()
        )
      })

      if (dayEvents.length > 0) {
        setSelectedDayBookings(dayEvents)
        setShowDayDetailModal(true)
      }
    }
  }

  const handleNavigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    
    switch (viewMode) {
      case 'month':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1))
        break
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
        break
      case 'day':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1))
        break
    }
    
    setCurrentDate(newDate)
    if (mode === 'viewing' || mode === 'management') {
      loadBookings()
    }
  }

  const handleServiceSelect = (service: ServiceOption) => {
    setSelectedService(service)
    setSelectedSlot(null) // Reset slot when service changes
  }

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.isAvailable || !selectedDate) return

    setSelectedSlot(slot)

    // If just selection (no booking creation), call onBookingSelect
    if (onBookingSelect && !allowBookingCreation) {
      const selection: BookingSelection = {
        date: selectedDate.toISOString().split('T')[0],
        time: slot.start,
        serviceName: selectedService?.name || listing?.service_name || listing?.title || 'Service',
        servicePrice: selectedService?.price || listing?.budget_min || slot.price || 0,
        currency: selectedService?.currency || listing?.currency || 'GBP',
        durationMinutes: selectedService?.duration || slot.duration || 60,
      }
      onBookingSelect(selection)
      return
    }

    // If booking creation is allowed, show booking form
    if (allowBookingCreation && selectedService) {
      setShowBookingForm(true)
    }
  }

  const handleBookingComplete = async (bookingData: {
    notes?: string
    recurringPattern?: RecurringPattern
    participantCount?: number
    deliveryAddress?: string
    pickupAddress?: string
    estimatedArrival?: string
  }) => {
    if (!selectedSlot || !selectedService || !selectedDate || !currentUser || !listingId) {
      Alert.alert('Error', 'Missing booking information')
      return
    }

    setBookingLoading(true)
    try {
      if (utility === 'slotCalculator') {
        // Use slotCalculator for booking
        const result = await slotCalculator.bookTimeSlot(listingId, currentUser.id, {
          date: selectedDate.toISOString().split('T')[0],
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          serviceName: selectedService.name,
          servicePrice: selectedService.price,
          currency: selectedService.currency,
          customerNotes: bookingData.notes,
        })

        if (result.success && result.bookingId) {
          Alert.alert(
            'Booking Requested',
            'Your booking request has been sent. You\'ll receive a confirmation shortly.',
            [
              {
                text: 'OK',
                onPress: () => {
                  onBookingComplete?.(result.bookingId!)
                  setShowBookingForm(false)
                  onClose?.()
                },
              },
            ]
          )
        } else {
          Alert.alert('Booking Failed', result.error || 'Unable to complete booking')
        }
      } else {
        // Use direct booking creation for getAvailableTimeSlots utility
        const bookingDateTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedSlot.start}`)
        const endDateTime = new Date(bookingDateTime.getTime() + (selectedService.duration || 60) * 60 * 1000)

        // Get provider profile ID
        const { data: providerProfile } = await supabase
          .from('provider_profiles')
          .select('id')
          .eq('user_id', listing?.user_id || '')
          .single()

        if (!providerProfile) {
          Alert.alert('Error', 'Provider profile not found')
          return
        }

        const { data: booking, error } = await supabase
          .from('bookings')
          .insert({
            listing_id: listingId,
            provider_id: providerProfile.id,
            customer_id: currentUser.id,
            start_time: bookingDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            service_name: selectedService.name,
            service_price: selectedService.price,
            currency: selectedService.currency,
            status: 'pending',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            customer_notes: (() => {
              let notes = bookingData.notes || ''
              if (bookingData.participantCount) {
                notes += `${notes ? '\n\n' : ''}Participants: ${bookingData.participantCount}`
              }
              if (bookingData.deliveryAddress) {
                notes += `${notes ? '\n\n' : ''}Delivery Address: ${bookingData.deliveryAddress}`
              }
              if (bookingData.pickupAddress) {
                notes += `${notes ? '\n\n' : ''}Pickup: ${bookingData.pickupAddress}`
                if (bookingData.deliveryAddress) {
                  notes += `\nDrop-off: ${bookingData.deliveryAddress}`
                }
              }
              return notes.trim() || undefined
            })(),
          })
          .select()
          .single()

        if (error) throw error

        Alert.alert(
          'Booking Requested',
          'Your booking request has been sent. You\'ll receive a confirmation shortly.',
          [
            {
              text: 'OK',
              onPress: () => {
                onBookingComplete?.(booking.id)
                setShowBookingForm(false)
                onClose?.()
              },
            },
          ]
        )
      }

      // Reload bookings if in viewing/management mode
      if (mode === 'viewing' || mode === 'management') {
        loadBookings()
      }
    } catch (error) {
      console.error('Booking error:', error)
      Alert.alert('Error', 'Failed to create booking')
    } finally {
      setBookingLoading(false)
    }
  }

  const handleCreateQuickEvent = () => {
    if (!userId) return
    setShowQuickEventForm(true)
  }

  const handleQuickEventCreated = () => {
    setShowQuickEventForm(false)
    if (mode === 'viewing' || mode === 'management') {
      loadBookings()
    }
  }

  const getBookingSelection = (): BookingSelection | null => {
    if (!selectedSlot || !selectedService || !selectedDate) return null

    return {
      date: selectedDate.toISOString().split('T')[0],
      time: selectedSlot.start,
      serviceName: selectedService.name,
      servicePrice: selectedService.price,
      currency: selectedService.currency,
      durationMinutes: selectedService.duration,
    }
  }

  // Render view mode toggle
  const renderViewModeToggle = () => {
    if (availableViewModes.length <= 1) return null

    return (
      <View style={styles.viewModeContainer}>
        {availableViewModes.map(mode => (
          <Pressable
            key={mode}
            style={[
              styles.viewModeButton,
              viewMode === mode && styles.viewModeButtonActive,
            ]}
            onPress={() => setViewMode(mode)}
          >
            <Text
              style={[
                styles.viewModeText,
                viewMode === mode && styles.viewModeTextActive,
              ]}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
    )
  }

  // Render booking mode
  const renderBookingMode = () => {
    if (!listing && !listingId) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Listing information required</Text>
        </View>
      )
    }

    const effectiveListing = listing || ({} as Listing)

    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header - Only show in modal mode (not in CollapsibleSection) */}
        {visible === true && (
          <View style={styles.header}>
            <Pressable 
              onPress={onClose || (() => {})} 
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
            <View style={styles.headerContent}>
              <Text style={styles.title}>
                {mode === 'booking' ? 'Book' : 'Select'} {effectiveListing.title || 'Service'}
              </Text>
              {provider && <Text style={styles.subtitle}>with {provider.name}</Text>}
            </View>
            <View style={styles.placeholder} />
          </View>
        )}

        {/* View Mode Toggle */}
        {renderViewModeToggle()}

        {/* Service Selection */}
        {showServiceSelection && listingId && (
          <ServiceSelector
            listingId={listingId}
            selectedService={selectedService}
            onServiceSelect={handleServiceSelect}
            budgetType={effectiveListing.budget_type || 'fixed'}
            priceList={effectiveListing.price_list}
            currency={effectiveListing.currency}
          />
        )}

        {/* Calendar Grid */}
        <CalendarGrid
          currentDate={currentDate}
          selectedDate={selectedDate}
          viewMode={viewMode}
          events={[]}
          onDateSelect={handleDateSelect}
          onNavigate={handleNavigate}
          showEventDots={false}
        />

        {/* Time Slots */}
        {showTimeSlots &&
          selectedDate &&
          listingId &&
          (utility === 'getAvailableTimeSlots' || selectedService) && (
            <TimeSlotSelector
              listingId={listingId}
              selectedDate={selectedDate.toISOString().split('T')[0]}
              selectedService={selectedService || undefined}
              onSlotSelect={handleSlotSelect}
              utility={utility}
            />
          )}

        {/* Instructions when no date selected */}
        {!selectedDate && (
          <View style={styles.instructionsContainer}>
            <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
            <Text style={styles.instructionsTitle}>Select a Date</Text>
            <Text style={styles.instructionsText}>
              Tap on any available date to see booking times
            </Text>
          </View>
        )}
      </ScrollView>
    )
  }

  // Render viewing mode
  const renderViewingMode = () => {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* View Mode Toggle */}
        {renderViewModeToggle()}

        {/* Calendar Grid */}
        <CalendarGrid
          currentDate={currentDate}
          selectedDate={selectedDate}
          viewMode={viewMode}
          events={events}
          onDateSelect={handleDateSelect}
          onNavigate={handleNavigate}
          showEventDots={showEventDots}
        />

        {/* Event Display */}
        <EventDisplay
          events={events}
          viewMode={viewMode}
          selectedDate={selectedDate}
          onEventPress={onEventPress}
          showStatusColors={true}
          userCurrency={userCurrency}
        />
      </ScrollView>
    )
  }

  // Render management mode
  const renderManagementMode = () => {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* View Mode Toggle */}
        {renderViewModeToggle()}

        {/* Calendar Grid */}
        <CalendarGrid
          currentDate={currentDate}
          selectedDate={selectedDate}
          viewMode={viewMode}
          events={events}
          onDateSelect={handleDateSelect}
          onNavigate={handleNavigate}
          showEventDots={showEventDots}
          showAddButton={allowBookingCreation}
          onAddEvent={(date) => {
            setSelectedDate(date)
            handleCreateQuickEvent()
          }}
        />

        {/* Event Display */}
        <EventDisplay
          events={events}
          viewMode={viewMode}
          selectedDate={selectedDate}
          onEventPress={onEventPress}
          showStatusColors={true}
          userCurrency={userCurrency}
        />

        {/* Stats */}
        {showStats && (
          <CalendarStats
            bookings={events}
            viewMode={viewMode}
            selectedDate={selectedDate}
            viewType={viewType}
          />
        )}

        {/* External Calendar Sync */}
        {showExternalSync && userId && (
          <ExternalCalendarSync
            userId={userId}
            onSyncComplete={loadBookings}
            showProviders={['google', 'outlook', 'icloud']}
          />
        )}
      </ScrollView>
    )
  }

  if (loading && (mode === 'viewing' || mode === 'management')) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f25842" />
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    )
  }

  const content = (
    <>
      {mode === 'booking' && renderBookingMode()}
      {mode === 'viewing' && renderViewingMode()}
      {mode === 'management' && renderManagementMode()}

      {/* Booking Form Modal */}
      {showBookingForm && getBookingSelection() && (
        <BookingForm
          bookingSelection={getBookingSelection()!}
          providerName={provider?.name || 'Provider'}
          onComplete={handleBookingComplete}
          onCancel={() => setShowBookingForm(false)}
          allowRecurring={showRecurring}
          allowNotes={true}
          loading={bookingLoading}
          listingType={listing?.listing_type}
          maxParticipants={(listing as any)?.experience_max_participants}
        />
      )}

      {/* Quick Event Form Modal */}
      {showQuickEventForm && userId && (
        <QuickEventForm
          visible={showQuickEventForm}
          onClose={() => setShowQuickEventForm(false)}
          selectedDate={
            selectedDate
              ? selectedDate.toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0]
          }
          userId={userId}
          viewType={viewType === 'provider' ? 'provider' : 'customer'}
          onEventCreated={handleQuickEventCreated}
        />
      )}

      {/* Day Detail Modal - Shows bookings for selected day */}
      {showDayDetailModal && (
        <Modal
          visible={showDayDetailModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowDayDetailModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => setShowDayDetailModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
              <Text style={styles.modalTitle}>
                {selectedDate?.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.modalContent}>
              {selectedDayBookings.length === 0 ? (
                <View style={styles.emptyDayModal}>
                  <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
                  <Text style={styles.emptyDayModalText}>No bookings for this day</Text>
                </View>
              ) : (
                selectedDayBookings.map(event => (
                  <Pressable
                    key={event.id}
                    style={[
                      styles.dayBookingCard,
                      { borderLeftColor: event.color || '#f25842' },
                    ]}
                    onPress={() => {
                      // Navigate to booking details
                      router.push(`/bookings/${event.id}`)
                      setShowDayDetailModal(false)
                    }}
                  >
                    <View style={styles.dayBookingHeader}>
                      <Text style={styles.dayBookingTime}>
                        {event.start.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        -{' '}
                        {event.end.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      <View
                        style={[
                          styles.dayBookingStatus,
                          { backgroundColor: event.color || '#f25842' },
                        ]}
                      >
                        <Text style={styles.dayBookingStatusText}>
                          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.dayBookingTitle}>{event.title}</Text>
                    {event.provider && (
                      <Text style={styles.dayBookingDetail}>
                        Provider: {event.provider}
                      </Text>
                    )}
                    {event.customer && (
                      <Text style={styles.dayBookingDetail}>
                        Customer: {event.customer}
                      </Text>
                    )}
                    {event.price && (
                      <Text style={styles.dayBookingPrice}>
                        {event.currency || 'GBP'} {event.price.toFixed(2)}
                      </Text>
                    )}
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </Modal>
      )}
    </>
  )

  // Wrap in Modal if visible prop is provided and true
  if (visible === true) {
    return (
      <Modal
        visible={true}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose || (() => {})}
      >
        <View style={styles.wrapper}>{content}</View>
      </Modal>
    )
  }

  // If visible is false, return null (component is hidden)
  if (visible === false) {
    return null
  }

  // If visible is undefined, render directly as children of CollapsibleSection (like other tabs)
  // No wrapper View needed - CollapsibleSection provides the container
  return <>{content}</>
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Transparent - CollapsibleSection provides background
  },
  loadingContainer: {
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
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 8,
    marginRight: 12,
    minWidth: 40,
  },
  placeholder: {
    width: 40,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 3,
    margin: 16,
    marginBottom: 8,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 7,
    alignItems: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  viewModeTextActive: {
    color: '#f25842',
    fontWeight: '600',
  },
  instructionsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  managementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  managementTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  managementSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  // Day Detail Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  emptyDayModal: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyDayModalText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  dayBookingCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 4,
  },
  dayBookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayBookingTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  dayBookingStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dayBookingStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  dayBookingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  dayBookingDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  dayBookingPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 8,
  },
})

