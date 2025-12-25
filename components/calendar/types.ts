/**
 * Shared types for Unified Calendar components
 */

import type { Listing, User, Booking } from '@/lib/types'

export type CalendarMode = 'booking' | 'viewing' | 'management'
export type CalendarViewMode = 'month' | 'week' | 'day' | 'list'
export type ViewType = 'customer' | 'provider' | 'both'
export type SlotUtility = 'slotCalculator' | 'getAvailableTimeSlots'

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  color?: string
  provider?: string
  customer?: string
  price?: number
  currency?: string
}

export interface ServiceOption {
  id?: string
  name: string
  duration: number // minutes
  price: number
  currency: string
  color?: string
}

export interface TimeSlot {
  id?: string
  start: string // HH:MM format
  end: string // HH:MM format
  startDateTime?: string // ISO datetime
  endDateTime?: string // ISO datetime
  duration: number // minutes
  isAvailable: boolean
  price?: number
  currency?: string
  serviceName?: string
  serviceColor?: string
  conflictReason?: string
}

export interface BookingSelection {
  date: string // YYYY-MM-DD
  time: string // HH:MM
  serviceName: string
  servicePrice: number
  currency?: string
  durationMinutes: number
}

export interface RecurringPattern {
  recurrencePattern: 'daily' | 'weekly' | 'monthly'
  recurrenceEndDate: string
  numberOfOccurrences?: number
}

export interface CalendarGridProps {
  currentDate: Date
  selectedDate: Date | null
  viewMode: CalendarViewMode
  events?: CalendarEvent[]
  onDateSelect: (date: Date) => void
  onNavigate: (direction: 'prev' | 'next') => void
  minDate?: Date
  maxDate?: Date
  disabledDates?: Date[]
  showEventDots?: boolean
  showAddButton?: boolean
  onAddEvent?: (date: Date) => void
}

export interface TimeSlotSelectorProps {
  listingId: string
  selectedDate: string
  selectedService?: ServiceOption
  onSlotSelect: (slot: TimeSlot) => void
  utility: SlotUtility
  loading?: boolean
}

export interface ServiceSelectorProps {
  listingId: string
  selectedService?: ServiceOption
  onServiceSelect: (service: ServiceOption) => void
  budgetType: 'fixed' | 'range' | 'hourly' | 'price_list'
  priceList?: Array<{ id: string; serviceName: string; price: string }>
  currency?: string
}

export interface BookingFormProps {
  bookingSelection: BookingSelection
  providerName: string
  onComplete: (bookingData: {
    notes?: string
    recurringPattern?: RecurringPattern
  }) => Promise<void>
  onCancel: () => void
  allowRecurring?: boolean
  allowNotes?: boolean
  loading?: boolean
}

export interface EventDisplayProps {
  events: CalendarEvent[]
  viewMode: CalendarViewMode
  selectedDate?: Date | null
  onEventPress?: (event: CalendarEvent) => void
  showStatusColors?: boolean
  userCurrency?: string | null
}

export interface CalendarStatsProps {
  bookings: CalendarEvent[]
  viewMode: CalendarViewMode
  selectedDate?: Date | null
  viewType?: ViewType
}

export interface ExternalCalendarSyncProps {
  userId: string
  onSyncComplete?: () => void
  showProviders?: ('google' | 'outlook' | 'icloud')[]
}

export interface UnifiedCalendarProps {
  // Mode configuration
  mode: CalendarMode
  
  // Booking mode props
  listingId?: string
  listing?: Listing
  provider?: User
  onBookingSelect?: (selection: BookingSelection) => void
  onBookingComplete?: (bookingId: string) => void
  
  // Viewing mode props
  userId?: string
  viewType?: ViewType
  
  // Feature toggles
  showTimeSlots?: boolean
  showServiceSelection?: boolean
  allowBookingCreation?: boolean
  showExternalSync?: boolean
  showStats?: boolean
  showRecurring?: boolean
  showEventDots?: boolean
  
  // View modes
  defaultViewMode?: CalendarViewMode
  availableViewModes?: CalendarViewMode[]
  
  // Utility selection
  utility?: SlotUtility
  
  // Callbacks
  onDateSelect?: (date: Date) => void
  onEventPress?: (event: CalendarEvent) => void
  onClose?: () => void
  
  // UI props
  visible?: boolean
  initialDate?: Date
}

