# Izimate Booking System Documentation

## Overview

The Izimate Booking System is a comprehensive appointment scheduling solution that allows service providers to integrate their existing calendars and offer real-time availability to customers. The system supports Google Calendar integration, smart slot detection, and automated booking management.

## Architecture

### Database Schema

The booking system consists of several interconnected tables:

1. **`service_settings`** - Configuration for each bookable service listing
2. **`provider_busy_times`** - Busy times imported from external calendars
3. **`service_slots`** - Generated/calculated available slots for booking
4. **`bookings`** - Customer reservations and appointments
5. **`calendar_connections`** - OAuth tokens and calendar connection info
6. **`booking_notifications`** - Track notifications sent for bookings

### Core Components

#### 1. Slot Calculator (`lib/utils/slot-calculator.ts`)
- **Purpose**: Intelligently calculates available booking slots
- **Features**:
  - Considers working hours, break times, and buffer periods
  - Checks against existing bookings and external calendar events
  - Supports multiple service options with different durations
  - Handles timezone conversions

#### 2. Google Calendar Integration (`lib/utils/google-calendar.ts`)
- **Purpose**: Syncs with provider's Google Calendar
- **Features**:
  - OAuth 2.0 authentication flow
  - Real-time calendar sync
  - Busy time detection
  - Automatic booking creation in provider's calendar

#### 3. Booking Calendar Component (`components/booking/BookingCalendar.tsx`)
- **Purpose**: Customer-facing booking interface
- **Features**:
  - Interactive date selection
  - Real-time availability display
  - Service option selection
  - Booking confirmation flow

#### 4. Provider Dashboard (`components/dashboard/BookingManagementTab.tsx`)
- **Purpose**: Provider booking management interface
- **Features**:
  - View all bookings with filtering
  - Approve/decline booking requests
  - Mark bookings as complete or no-show
  - Add provider notes

## Setup Instructions

### 1. Database Setup

Run the following SQL scripts in your Supabase SQL Editor:

```sql
-- 1. Create booking system tables
\i create_booking_system.sql

-- 2. Update listings table for booking support
\i update_listings_for_booking.sql
```

### 2. Google Calendar OAuth Setup

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the Google Calendar API

2. **Configure OAuth Consent Screen**:
   - Go to APIs & Services > OAuth consent screen
   - Configure your app information
   - Add scopes: `calendar.readonly`, `calendar.events`

3. **Create OAuth Credentials**:
   - Go to APIs & Services > Credentials
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URIs

4. **Environment Variables**:
   ```env
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
   EXPO_PUBLIC_GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
   ```

### 3. Enable Booking for Listings

Update your listing creation flow to include the booking setup step:

```tsx
// In your listing creation wizard
import { Step5Booking } from '@/components/listings/steps/Step5Booking'

// Add as step 5 in your wizard
<Step5Booking
  formData={formData}
  onUpdate={handleFormUpdate}
  onNext={handleNext}
  onBack={handleBack}
  isLoading={isSubmitting}
/>
```

### 4. Add Booking Button to Listing Cards

```tsx
// In your swipe/browse pages
<ListingCard
  listing={listing}
  showBookingButton={true}
  onBookingComplete={handleBookingComplete}
  // ... other props
/>
```

## Usage Flow

### For Service Providers

1. **Setup Service**:
   - Create a listing with booking enabled
   - Configure service options (duration, pricing)
   - Set working hours and break times
   - Connect Google Calendar (optional)

2. **Manage Bookings**:
   - View booking requests in dashboard
   - Approve or decline requests
   - Mark completed bookings
   - Add notes for customers

### For Customers

1. **Book Appointment**:
   - Browse available services
   - Click "Book Appointment" button
   - Select preferred date and time
   - Choose service option
   - Add notes and confirm booking

2. **Booking Confirmation**:
   - Receive booking confirmation
   - Get calendar invite (if provider has calendar connected)
   - Receive reminders before appointment

## API Endpoints

The system uses the following main functions:

### Slot Calculator
```typescript
// Get available slots for a date
const slots = await slotCalculator.calculateAvailableSlots(
  listingId,
  date,
  serviceDuration
)

// Get availability calendar for date range
const calendar = await slotCalculator.getAvailabilityCalendar(
  listingId,
  startDate,
  endDate
)

// Book a time slot
const result = await slotCalculator.bookTimeSlot(
  listingId,
  customerId,
  slotData
)
```

### Google Calendar
```typescript
// Connect Google Calendar
const authUrl = googleCalendar.getAuthUrl(userId)

// Sync busy times
await googleCalendar.syncBusyTimes(
  userId,
  listingId,
  connection,
  startDate,
  endDate
)

// Create booking event
const eventId = await googleCalendar.createBookingEvent(
  accessToken,
  calendarId,
  eventData
)
```

## Database Queries

### Get Provider Bookings
```sql
SELECT 
  b.*,
  c.name as customer_name,
  l.title as listing_title
FROM bookings b
JOIN users c ON b.customer_id = c.id
JOIN listings l ON b.listing_id = l.id
WHERE b.provider_id = $1
ORDER BY b.booking_date, b.start_time;
```

### Get Available Slots
```sql
SELECT * FROM calculate_available_slots(
  listing_id,
  target_date,
  service_duration
);
```

## Security Considerations

1. **Row Level Security (RLS)**:
   - All booking tables have RLS enabled
   - Users can only access their own bookings
   - Providers can manage their service settings

2. **OAuth Token Security**:
   - Tokens should be encrypted in production
   - Implement token refresh logic
   - Store tokens securely with proper access controls

3. **Input Validation**:
   - Validate all booking parameters
   - Check slot availability before confirming
   - Prevent double bookings

## Performance Optimization

1. **Indexing**:
   - Indexes on frequently queried columns
   - Composite indexes for date/provider queries

2. **Caching**:
   - Cache availability calculations
   - Use Redis for frequently accessed data

3. **Background Jobs**:
   - Sync calendars in background
   - Send notifications asynchronously
   - Clean up expired slots

## Troubleshooting

### Common Issues

1. **Calendar Sync Failures**:
   - Check OAuth token expiry
   - Verify API quotas and limits
   - Review calendar permissions

2. **No Available Slots**:
   - Check working hours configuration
   - Verify calendar sync status
   - Review existing bookings

3. **Booking Creation Errors**:
   - Validate slot availability
   - Check user permissions
   - Review database constraints

### Debug Queries

```sql
-- Check service settings
SELECT * FROM service_settings WHERE listing_id = 'listing-id';

-- View busy times
SELECT * FROM provider_busy_times 
WHERE provider_id = 'user-id' 
AND DATE(start_time) = '2024-01-15';

-- Check calendar connections
SELECT * FROM calendar_connections 
WHERE user_id = 'user-id' AND is_active = true;
```

## Future Enhancements

1. **Multi-Calendar Support**:
   - Outlook Calendar integration
   - Apple Calendar support
   - Custom calendar providers

2. **Advanced Features**:
   - Recurring appointments
   - Group bookings
   - Waitlist management
   - Automated reminders

3. **Analytics**:
   - Booking conversion rates
   - Popular time slots
   - Revenue tracking
   - Customer insights

## Support

For technical support or questions about the booking system:

1. Check the troubleshooting section above
2. Review the database logs for errors
3. Test with the provided debug queries
4. Contact the development team with specific error messages

---

*Last updated: January 2024*