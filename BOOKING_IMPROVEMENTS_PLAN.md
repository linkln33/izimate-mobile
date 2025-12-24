# Booking System Improvements Implementation Plan

_Based on BOOKING_AUDIT.md recommendations_

## Executive Summary

This plan addresses the critical gaps identified in the booking audit:
1. **Booking Details Screen** - Canonical route for viewing/managing bookings
2. **Cancellation Policy Display** - Show policies in booking flows (we just added settings)
3. **Price Breakdown** - Transparent pricing display
4. **Trust Signals** - Ratings/reviews in booking screens
5. **Navigation Standardization** - Centralized booking navigation

---

## Current State Analysis

### ✅ What Exists
- **Booking Flows**: `BookingFlowManager`, `GuestCheckout`, `BiometricBookingConfirmation`
- **Booking History**: `BookingHistory` component with modals
- **Cancellation Settings**: Just added to `Step6Settings` (listing creation)
- **Service Settings**: `service_settings` table with `cancellation_hours`
- **Review System**: `ReviewWithIncentive`, rating components exist
- **Routes**: `/booking/[listingId]` for booking creation

### ❌ What's Missing
- **Booking Details Route**: No `/bookings/[id]` screen
- **Policy Display**: Settings exist but not shown to users
- **Price Breakdown**: Only total price shown
- **Trust Signals**: Ratings not in booking flows
- **Navigation Helpers**: No centralized booking navigation

---

## Implementation Plan

### Phase 1: Booking Details Screen (Priority: HIGH)

#### 1.1 Create Booking Details Route
**File**: `app/bookings/[id].tsx`

**Features**:
- Full booking information display
- Service details, provider info, exact time
- Address/online link
- Price breakdown (base, fees, discounts, total)
- Cancellation policy display
- Actions: Cancel, Reschedule, Contact, Rate
- Support options

**Data to Fetch**:
```typescript
- Booking (from bookings table)
- Listing (with service_settings)
- Provider (with ratings/reviews)
- Customer (if viewing as provider)
- Service settings (for cancellation policy)
- Review incentive settings (if applicable)
```

**Navigation Entry Points**:
- `BookingHistory` → Replace modal with route navigation
- `MyBookingsCalendar` → Calendar cell tap
- `BookingManagementTab` → Booking list item
- Chat confirmation bubbles → Deep link
- Notification links → Already reference `/bookings/[id]`

#### 1.2 Create Booking Details Component
**File**: `components/booking/BookingDetails.tsx`

**Sections**:
1. **Header**: Status badge, booking ID, date/time
2. **Service Info**: Service name, listing title, category
3. **Provider/Customer Info**: Avatar, name, rating, verification badge
4. **Location**: Address or online link
5. **Price Breakdown**: Base, fees, discounts, total
6. **Cancellation Policy**: Hours, fees, refund policy
7. **Actions**: Cancel, Reschedule, Contact, Rate (contextual)
8. **Timeline**: Created, confirmed, completed dates

**Props**:
```typescript
interface BookingDetailsProps {
  bookingId: string
  userId: string // Current user (customer or provider)
  onCancel?: () => void
  onReschedule?: () => void
  onContact?: () => void
  onRate?: () => void
}
```

---

### Phase 2: Cancellation Policy Display (Priority: HIGH)

#### 2.1 Create Policy Display Component
**File**: `components/booking/CancellationPolicyDisplay.tsx`

**Features**:
- Fetch `service_settings` for listing
- Display cancellation hours
- Show fee information (if enabled)
- Display refund policy
- Calculate time until booking
- Show warning if within cancellation window

**Usage Locations**:
- `BookingDetails` screen
- `BiometricBookingConfirmation` component
- `GuestCheckout` component
- Cancellation confirmation dialogs

#### 2.2 Update Cancellation Logic
**Files to Update**:
- `components/booking/BookingHistory.tsx` - Use actual policy from settings
- `components/booking/ClientBookingPortal.tsx` - Show policy before cancel
- `components/dashboard/BookingManagementTab.tsx` - Provider view with policy

**Logic**:
```typescript
// Fetch cancellation policy
const { data: serviceSettings } = await supabase
  .from('service_settings')
  .select('cancellation_hours, cancellation_fee_enabled, ...')
  .eq('listing_id', listingId)
  .single()

// Calculate if within window
const hoursUntilBooking = (bookingDate - now) / (1000 * 60 * 60)
const canCancelFree = hoursUntilBooking >= serviceSettings.cancellation_hours
const feeAmount = canCancelFree ? 0 : calculateFee(...)
```

---

### Phase 3: Price Breakdown Component (Priority: MEDIUM)

#### 3.1 Create Price Breakdown Component
**File**: `components/booking/PriceBreakdown.tsx`

**Features**:
- Base service price
- Service fees (if any)
- Taxes (if applicable)
- Discounts/coupons applied
- Total amount
- Currency formatting

**Props**:
```typescript
interface PriceBreakdownProps {
  basePrice: number
  currency: string
  fees?: number
  taxes?: number
  discount?: number
  discountType?: 'percentage' | 'fixed'
  couponCode?: string
}
```

**Usage Locations**:
- `BookingDetails` screen
- `BiometricBookingConfirmation`
- `GuestCheckout`
- Booking confirmation screens

---

### Phase 4: Trust Signals Integration (Priority: MEDIUM)

#### 4.1 Create Trust Signals Component
**File**: `components/booking/TrustSignals.tsx`

**Features**:
- Provider rating display
- Review count
- Verification badge
- "No-show protection" badge (if applicable)
- Response time indicator

**Props**:
```typescript
interface TrustSignalsProps {
  provider: User
  listing?: Listing
  showRating?: boolean
  showVerification?: boolean
  showReviews?: boolean
}
```

#### 4.2 Integrate into Booking Flows
**Files to Update**:
- `components/booking/InAppBookingCalendar.tsx` - Show provider rating
- `components/booking/BiometricBookingConfirmation.tsx` - Trust signals
- `components/booking/GuestCheckout.tsx` - Provider info with rating
- `app/booking/[listingId].tsx` - Provider card with trust signals

#### 4.3 Post-Booking Review Prompts
**Files to Update**:
- `components/booking/BookingDetails.tsx` - "Rate this service" button
- `components/booking/BookingHistory.tsx` - Review prompt for completed bookings
- Notification system - Push review prompts after completion

---

### Phase 5: Navigation & Utilities (Priority: MEDIUM)

#### 5.1 Create Navigation Helper
**File**: `lib/utils/booking-navigation.ts`

**Functions**:
```typescript
export function navigateToBookingDetails(bookingId: string, router: Router)
export function navigateToBookingFlow(listingId: string, router: Router, source?: string)
export function navigateToReview(bookingId: string, router: Router)
```

**Usage**: Replace all direct `router.push()` calls with these helpers

#### 5.2 Create Booking Utilities
**File**: `lib/utils/booking-helpers.ts`

**Functions**:
```typescript
// Fetch booking with all related data
export async function getBookingWithDetails(bookingId: string)

// Get cancellation policy for listing
export async function getCancellationPolicy(listingId: string)

// Calculate cancellation fee
export function calculateCancellationFee(
  bookingPrice: number,
  hoursUntilBooking: number,
  policy: CancellationPolicy
)

// Format price breakdown
export function formatPriceBreakdown(booking: Booking, listing: Listing)
```

---

## File Structure

```
app/
  bookings/
    [id].tsx                    # NEW: Booking details screen
    [id]/
      rate.tsx                  # Review/rating screen (may exist)

components/
  booking/
    BookingDetails.tsx          # NEW: Main booking details component
    CancellationPolicyDisplay.tsx  # NEW: Policy display component
    PriceBreakdown.tsx          # NEW: Price breakdown component
    TrustSignals.tsx            # NEW: Trust signals component
    BookingDetailsHeader.tsx   # NEW: Header section
    BookingDetailsActions.tsx  # NEW: Action buttons
    BookingDetailsTimeline.tsx # NEW: Timeline section

lib/
  utils/
    booking-navigation.ts      # NEW: Navigation helpers
    booking-helpers.ts         # NEW: Booking utility functions
    cancellation-policy.ts     # NEW: Policy calculation logic
```

---

## Implementation Steps

### Step 1: Setup & Utilities (Day 1)
1. ✅ Create `lib/utils/booking-helpers.ts` with data fetching functions
2. ✅ Create `lib/utils/cancellation-policy.ts` for policy logic
3. ✅ Create `lib/utils/booking-navigation.ts` for navigation helpers
4. ✅ Update `app/_layout.tsx` to add `/bookings/[id]` route

### Step 2: Booking Details Screen (Days 2-3)
1. ✅ Create `app/bookings/[id].tsx` route handler
2. ✅ Create `components/booking/BookingDetails.tsx` main component
3. ✅ Create sub-components (Header, Actions, Timeline)
4. ✅ Implement data fetching and loading states
5. ✅ Add error handling

### Step 3: Cancellation Policy Display (Day 4)
1. ✅ Create `components/booking/CancellationPolicyDisplay.tsx`
2. ✅ Integrate into `BookingDetails`
3. ✅ Update `BiometricBookingConfirmation` to show policy
4. ✅ Update `GuestCheckout` to show policy
5. ✅ Update cancellation dialogs to use actual policy

### Step 4: Price Breakdown (Day 5)
1. ✅ Create `components/booking/PriceBreakdown.tsx`
2. ✅ Integrate into `BookingDetails`
3. ✅ Update booking confirmation screens
4. ✅ Add discount/coupon support

### Step 5: Trust Signals (Day 6)
1. ✅ Create `components/booking/TrustSignals.tsx`
2. ✅ Integrate into booking flow screens
3. ✅ Add review prompts post-booking
4. ✅ Update provider cards in booking flows

### Step 6: Navigation Updates (Day 7)
1. ✅ Replace all booking navigation with helpers
2. ✅ Update `BookingHistory` to use route instead of modal
3. ✅ Update `MyBookingsCalendar` to navigate to details
4. ✅ Update chat bubbles to deep link
5. ✅ Test all navigation paths

### Step 7: Testing & Polish (Day 8)
1. ✅ Test all booking flows
2. ✅ Test cancellation with policies
3. ✅ Test price breakdowns
4. ✅ Test trust signals display
5. ✅ Fix any bugs
6. ✅ Update documentation

---

## Database Queries Needed

### Booking Details Query
```sql
SELECT 
  b.*,
  l.*,
  p.*,
  c.*,
  ss.cancellation_hours,
  ss.cancellation_fee_enabled,
  -- ... other service_settings fields
FROM bookings b
JOIN listings l ON b.listing_id = l.id
JOIN users p ON b.provider_id = p.id
LEFT JOIN users c ON b.customer_id = c.id
LEFT JOIN service_settings ss ON l.id = ss.listing_id
WHERE b.id = :bookingId
```

### Provider Ratings Query
```sql
SELECT 
  AVG((as_described + timing + communication + cost + performance) / 5.0) as avg_rating,
  COUNT(*) as review_count
FROM reviews
WHERE reviewee_id = :providerId
```

---

## Component Dependencies

```
BookingDetails
├── BookingDetailsHeader
├── TrustSignals (provider info)
├── PriceBreakdown
├── CancellationPolicyDisplay
├── BookingDetailsActions
└── BookingDetailsTimeline
```

---

## Integration Points

### 1. BookingHistory Component
**Current**: Modal for booking details
**Change**: Navigate to `/bookings/[id]` route
```typescript
// OLD
onPress={() => handleViewBookingDetails(item)}

// NEW
onPress={() => navigateToBookingDetails(item.id, router)}
```

### 2. MyBookingsCalendar
**Current**: Inline booking display
**Change**: Navigate to details on tap
```typescript
onPress={() => navigateToBookingDetails(booking.id, router)}
```

### 3. BookingManagementTab
**Current**: Modal for booking details
**Change**: Navigate to details route
```typescript
onPress={() => navigateToBookingDetails(booking.id, router)}
```

### 4. Chat Booking Bubbles
**Current**: Basic booking info
**Change**: Deep link to booking details
```typescript
<Pressable onPress={() => navigateToBookingDetails(bookingId, router)}>
  {/* Booking info */}
</Pressable>
```

### 5. Notification Links
**Current**: Already reference `/bookings/[id]`
**Status**: ✅ Already correct, just need to implement the route

---

## Testing Checklist

### Booking Details Screen
- [ ] Loads booking data correctly
- [ ] Shows all sections (service, provider, price, policy)
- [ ] Cancel button works with policy enforcement
- [ ] Reschedule button navigates correctly
- [ ] Contact button opens chat
- [ ] Rate button navigates to review screen
- [ ] Handles loading states
- [ ] Handles error states
- [ ] Works for both customer and provider views

### Cancellation Policy
- [ ] Displays correct cancellation hours
- [ ] Shows fee when within window
- [ ] Calculates fee correctly (percentage vs fixed)
- [ ] Shows refund policy
- [ ] Updates in real-time as booking approaches

### Price Breakdown
- [ ] Shows base price
- [ ] Shows fees (if any)
- [ ] Shows taxes (if any)
- [ ] Shows discounts correctly
- [ ] Calculates total correctly
- [ ] Formats currency correctly

### Trust Signals
- [ ] Shows provider rating
- [ ] Shows review count
- [ ] Shows verification badge
- [ ] Appears in all booking flows
- [ ] Review prompts appear after completion

### Navigation
- [ ] All entry points navigate correctly
- [ ] Deep links work from notifications
- [ ] Back navigation works correctly
- [ ] No broken routes

---

## Success Metrics

1. **Booking Details Screen**:
   - 100% of booking views use the new screen (no modals)
   - < 2s load time for booking details
   - Zero navigation errors

2. **Policy Transparency**:
   - Cancellation policies visible in 100% of booking flows
   - Users see policy before confirming booking
   - Cancellation fee calculations are accurate

3. **Trust Signals**:
   - Provider ratings visible in all booking screens
   - Review prompts shown for 100% of completed bookings
   - Verification badges displayed consistently

4. **Price Transparency**:
   - Price breakdowns shown in all confirmation screens
   - Zero pricing calculation errors
   - Currency formatting consistent

---

## Future Enhancements (Post-MVP)

1. **Reschedule Functionality**: Full reschedule flow (currently just message)
2. **Payment Integration**: If adding in-app payments
3. **Advanced Analytics**: Booking conversion tracking
4. **Multi-language**: Policy text translations
5. **Accessibility**: Screen reader support, keyboard navigation

---

## Notes

- All cancellation policy data comes from `service_settings` table (we just added this)
- Review incentive settings come from `review_incentive_settings` table
- Provider ratings come from `reviews` table aggregation
- Price breakdown may need additional fields in `bookings` table for fees/taxes

---

## Estimated Timeline

- **Phase 1** (Booking Details): 2-3 days
- **Phase 2** (Cancellation Policy): 1 day
- **Phase 3** (Price Breakdown): 1 day
- **Phase 4** (Trust Signals): 1 day
- **Phase 5** (Navigation): 1 day
- **Testing & Polish**: 1 day

**Total**: ~7-8 days of focused development

---

## Priority Order

1. **Booking Details Screen** - Foundation for everything else
2. **Cancellation Policy Display** - Critical for transparency
3. **Price Breakdown** - Important for trust
4. **Trust Signals** - Nice to have, improves conversion
5. **Navigation Helpers** - Cleanup and standardization

