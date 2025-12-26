# Listing Types Implementation Plan - Modular Architecture

## 🎯 Overview

This plan outlines a **modular, maintainable architecture** for implementing features across all 12 listing types. Each listing type will have its own dedicated component module, making it easy to maintain, test, and extend.

---

## 📁 Modular Component Structure

```
components/listings/
├── steps/
│   ├── Step1BasicInfo.tsx          # Step 1: Basic Information (already done)
│   ├── Step2Budget.tsx             # Step 2: Budget & Payment (main orchestrator, will route to type-specific components)
│   ├── Step3Booking.tsx            # Step 3: Booking & Schedule (already done)
│   ├── Step4Settings.tsx           # Step 4: Settings (already done)
│   ├── Step5Location.tsx           # Step 5: Location (already done)
│   └── Step6Review.tsx             # Step 6: Review (will display type-specific summaries)
│
└── pricing/                         # NEW: Type-specific pricing components
    ├── RentalPricing.tsx            # ✅ Already implemented
    ├── ExperiencePricing.tsx        # 🆕 To implement
    ├── SubscriptionPricing.tsx     # 🆕 To implement
    ├── FreelancePricing.tsx         # 🆕 To implement (includes UGC)
    ├── AuctionPricing.tsx            # 🆕 To implement
    ├── SpaceSharingPricing.tsx      # 🆕 To implement
    ├── FundraisingPricing.tsx       # 🆕 To implement
    ├── DeliveryPricing.tsx           # 🆕 To implement
    ├── TaxiPricing.tsx              # 🆕 To implement
    └── LinkPricing.tsx              # 🆕 To implement
```

---

## 🎬 UGC Creator (Freelance Category) - Detailed Specification

### What is UGC Creator?
**User-Generated Content (UGC) Creators** are freelancers who create authentic content (videos, photos, posts) for brands and businesses. They're a specialized subset of freelance services.

### UGC Creator Specific Features

#### 1. **Category Selection**
- **Type**: `freelance`
- **Sub-category**: `ugc` (User-Generated Content)
- **Other freelance categories**: `design`, `writing`, `video`, `photography`, `social_media`, `consulting`, `other`

#### 2. **Portfolio & Showcase**
- **Portfolio URL**: Link to creator's portfolio (TikTok, Instagram, YouTube, personal website)
- **Skills Tags**: Array of skills (e.g., "TikTok Videos", "Product Reviews", "Unboxing", "Storytelling", "Food Content", "Fashion Content")
- **Content Type**: What they specialize in creating
  - Short-form video (TikTok, Reels, Shorts)
  - Long-form video (YouTube)
  - Static posts (Instagram, Facebook)
  - Stories (Instagram, Snapchat)
  - Live streams

#### 3. **Pricing Models** (Flexible for UGC)
- **Fixed Price**: One-time project fee (e.g., $500 for 3 TikTok videos)
- **Per Project**: Price per content piece (e.g., $150 per video)
- **Per Hour**: Hourly rate for consultation or content creation
- **Package Deals**: Multiple content pieces at discounted rate

#### 4. **Delivery & Revisions**
- **Delivery Days**: Estimated turnaround time (e.g., 5-7 days)
- **Revisions Included**: Number of free revisions (e.g., 2 revisions)
- **Rush Delivery**: Optional faster delivery for extra fee

#### 5. **Content Specifications**
- **Video Length**: 15s, 30s, 60s, 90s, 2min+
- **Platform**: TikTok, Instagram, YouTube, Facebook, LinkedIn, etc.
- **Format**: Vertical (9:16), Square (1:1), Horizontal (16:9)
- **Style**: Authentic, Polished, Raw, Educational, Entertaining
- **Hashtags Included**: Yes/No
- **Caption Writing**: Included/Extra fee

#### 6. **Requirements & Preferences**
- **Product Categories**: What they're comfortable promoting
  - Beauty & Skincare
  - Fashion & Apparel
  - Food & Beverage
  - Tech & Electronics
  - Fitness & Wellness
  - Home & Lifestyle
  - Travel & Adventure
- **Brand Alignment**: Values they align with
- **Exclusivity**: Will they work with competitors?

#### 7. **Performance Metrics** (Optional, for experienced creators)
- **Average Views**: Past content performance
- **Engagement Rate**: Average likes/comments ratio
- **Follower Count**: Social media reach
- **Verified Accounts**: Platform verification status

---

## 📋 All Listing Types - Feature Matrix

### 1. **Service** ✅ (Fully Implemented)
- Standard pricing (fixed, range, price_list)
- Booking system
- Time slots
- Service categories

### 2. **Goods** ✅ (Fully Implemented)
- Standard pricing
- Stock quantity
- Shipping options
- Product categories

### 3. **Rental** ✅ (Fully Implemented)
- Duration types (hourly, daily, weekly, monthly)
- Rental rates per duration
- Security deposit
- Cleaning fee
- Insurance requirements
- Pickup/delivery options

### 4. **Experience** 🆕 (To Implement)
**Features:**
- Duration (hours)
- Max participants
- Min age requirement
- What's included (array)
- Meeting point
- Cancellation policy
- Group discounts
- Language options

**Use Cases:**
- Tours (city walks, food tours)
- Workshops (cooking, art, photography)
- Classes (yoga, dance, music)
- Events (concerts, festivals)
- Virtual experiences

### 5. **Subscription** 🆕 (To Implement)
**Features:**
- Billing cycle (weekly, monthly, quarterly, yearly)
- Price per cycle
- Trial days (free trial period)
- Auto-renewal toggle
- Features list (what's included)
- Cancellation policy
- Upgrade/downgrade options

**Use Cases:**
- Cleaning services (weekly/monthly)
- Meal prep subscriptions
- Gym/co-working memberships
- Software access
- Beauty boxes
- Online courses

### 6. **Freelance** 🆕 (To Implement - Includes UGC)
**Features:**
- Category (UGC, design, writing, video, photography, social_media, consulting, other)
- Portfolio URL
- Delivery days
- Revisions included
- Skills array
- Pricing model (fixed, per_project, per_hour)

**UGC-Specific:**
- Content type (short-form, long-form, static, stories)
- Platform specialization
- Video length options
- Format preferences
- Product categories they work with

**Use Cases:**
- UGC creators (TikTok, Instagram content)
- Graphic designers
- Video editors
- Content writers
- Social media managers
- Consultants

### 7. **Auction** 🆕 (To Implement)
**Features:**
- Start price
- Reserve price (minimum acceptable)
- End time (when auction closes)
- Bid increment (minimum bid increase)
- Buy now price (optional instant purchase)
- Current highest bid (display only)
- Auction status (upcoming, active, ended, sold, cancelled)

**Use Cases:**
- Art & collectibles
- Antiques
- Electronics
- Vehicles
- Real estate
- Charity auctions

### 8. **Space Sharing** 🆕 (To Implement)
**Features:**
- Space type (parking, storage, workspace, event_venue, studio, kitchen, couchsurfing, other)
- Capacity (people, cars, items)
- Amenities array (WiFi, parking, kitchen, etc.)
- Hourly rate
- Daily rate
- Availability calendar
- Rules & restrictions

**Use Cases:**
- Parking spaces
- Storage units
- Co-working desks
- Event venues
- Photo/video studios
- Kitchen rentals
- Couchsurfing

### 9. **Fundraising** 🆕 (To Implement)
**Features:**
- Goal amount
- Current amount raised (auto-updated)
- End date
- Category (charity, personal, business, event, medical, education, other)
- Beneficiary name
- Donation tiers (optional)
- Progress percentage (calculated)
- Donor count (display only)

**Use Cases:**
- Charity campaigns
- Medical expenses
- Education funding
- Business startups
- Community projects
- Emergency relief

### 10. **Delivery** 🆕 (To Implement)
**Features:**
- Delivery type (food, grocery, package, medicine, other)
- Service radius (km)
- Fee structure (fixed, distance_based, weight_based)
- Estimated delivery time (minutes)
- Minimum order value
- Delivery hours
- Vehicle type

**Use Cases:**
- Food delivery
- Grocery delivery
- Package courier
- Pharmacy delivery
- Document delivery

### 11. **Taxi** 🆕 (To Implement)
**Features:**
- Vehicle type (standard, luxury, van, motorcycle, bike)
- Max passengers
- License number (for verification)
- Base fare
- Per km rate
- Waiting time rate
- Airport transfer (yes/no)
- Pet-friendly (yes/no)
- Accessible (wheelchair-friendly, yes/no)

**Use Cases:**
- Standard rides
- Luxury transport
- Van service (groups)
- Airport transfers
- Pet-friendly rides
- Accessible transport

### 12. **Link** 🆕 (To Implement)
**Features:**
- URL (destination link)
- Link type (affiliate, redirect, short_link)
- Click tracking (auto-increment)
- Description (what the link is for)
- Expiry date (optional)
- Password protection (optional)

**Use Cases:**
- Affiliate product links
- External service redirects
- Blog post links
- Portfolio links
- Download links
- Booking page redirects

---

## 🏗️ Implementation Architecture

### Phase 1: Foundation (Current State)
✅ Listing types defined in data model
✅ Type selection UI in Step1BasicInfo
✅ Categories for each type
✅ Rental pricing fully implemented

### Phase 2: Modular Components (Next Steps)

#### Step 1: Create Pricing Component Directory
```
components/listings/pricing/
├── index.ts                          # Export all pricing components
├── RentalPricing.tsx                 # ✅ Already exists (inline in Step2Budget)
├── ExperiencePricing.tsx             # 🆕 New
├── SubscriptionPricing.tsx          # 🆕 New
├── FreelancePricing.tsx             # 🆕 New (includes UGC)
├── AuctionPricing.tsx               # 🆕 New
├── SpaceSharingPricing.tsx          # 🆕 New
├── FundraisingPricing.tsx          # 🆕 New
├── DeliveryPricing.tsx              # 🆕 New
├── TaxiPricing.tsx                 # 🆕 New
└── LinkPricing.tsx                  # 🆕 New
```

#### Step 2: Component Interface (Standardized)
```typescript
interface PricingComponentProps {
  formState: ListingFormState
  formActions: ListingFormActions
  currency: CurrencyCode
  selectedCurrency: Currency
}
```

#### Step 3: Update Step2Budget.tsx (Orchestrator)
```typescript
// Step2Budget.tsx becomes a router
export function Step2Budget({ formState, formActions }: Step2BudgetProps) {
  const { listing_type } = formState
  
  // Route to appropriate pricing component
  switch (listing_type) {
    case 'rental':
      return <RentalPricing {...props} />
    case 'experience':
      return <ExperiencePricing {...props} />
    case 'subscription':
      return <SubscriptionPricing {...props} />
    case 'freelance':
      return <FreelancePricing {...props} /> // Includes UGC
    case 'auction':
      return <AuctionPricing {...props} />
    case 'space_sharing':
      return <SpaceSharingPricing {...props} />
    case 'fundraising':
      return <FundraisingPricing {...props} />
    case 'delivery':
      return <DeliveryPricing {...props} />
    case 'taxi':
      return <TaxiPricing {...props} />
    case 'link':
      return <LinkPricing {...props} />
    default:
      return <StandardPricing {...props} /> // For service/goods
  }
}
```

#### Step 4: Extract RentalPricing (Refactor)
- Move rental pricing logic from Step2Budget.tsx to RentalPricing.tsx
- Keep same functionality, just modularized

**Note**: Step order is now:
1. Step 1: Basic Information
2. Step 2: Budget & Payment
3. Step 3: Booking & Schedule
4. Step 4: Settings
5. Step 5: Location
6. Step 6: Review

#### Step 5: Implement Each Type (One by One)
1. Create component file
2. Implement UI with form fields
3. Wire up form state setters
4. Add validation logic
5. Test thoroughly

---

## 🔧 Technical Implementation Details

### Form State Management
All state is managed in `useListingForm.ts`:
- ✅ State variables defined
- ⏳ Setters need to be added to `ListingFormActions` interface
- ⏳ Setters need to be added to return object
- ⏳ State needs to be included in `formState` return object

### Validation Logic
Validation happens in `listingHandlers.ts`:
- ✅ Rental validation implemented
- ⏳ Need validation for each new type
- Each type has different required fields

### Database Schema
Fields are already defined in `lib/types.ts`:
- ✅ All fields exist in `Listing` interface
- ⏳ Need to ensure Supabase schema matches

### Review & Display
`Step6Review.tsx` needs to:
- Display type-specific summary
- Show relevant fields for each type
- Format data appropriately

---

## 📝 Implementation Order (Recommended)

### Priority 1: High-Value Types
1. **Freelance (UGC)** - High demand, unique features
2. **Subscription** - Recurring revenue model
3. **Experience** - Growing market

### Priority 2: Specialized Types
4. **Auction** - Complex but valuable
5. **Space Sharing** - Niche but useful
6. **Fundraising** - Social impact

### Priority 3: Service Types
7. **Delivery** - Service-based
8. **Taxi** - Service-based
9. **Link** - Simple but useful

---

## 🎨 UGC Creator - UI Mockup Concept

```
┌─────────────────────────────────────┐
│ Freelance Service Setup             │
├─────────────────────────────────────┤
│ Category: [UGC Creator ▼]          │
│                                      │
│ Portfolio URL:                       │
│ [https://tiktok.com/@creator]       │
│                                      │
│ Skills:                              │
│ [TikTok Videos] [Product Reviews]   │
│ [+ Add Skill]                        │
│                                      │
│ Pricing Model:                       │
│ [●] Fixed Price  [ ] Per Project    │
│ [ ] Per Hour                         │
│                                      │
│ Fixed Price: £500                    │
│                                      │
│ Content Type:                        │
│ [●] Short-form  [ ] Long-form       │
│ [ ] Static Posts  [ ] Stories        │
│                                      │
│ Platforms:                           │
│ [✓] TikTok  [✓] Instagram           │
│ [ ] YouTube  [ ] Facebook           │
│                                      │
│ Delivery: 5 days                     │
│ Revisions: 2 included                │
└─────────────────────────────────────┘
```

---

## ✅ Benefits of Modular Architecture

1. **Easy Maintenance**: Each type is isolated, changes don't affect others
2. **Reusability**: Common patterns can be extracted to shared components
3. **Testability**: Each component can be tested independently
4. **Scalability**: Easy to add new listing types in the future
5. **Code Organization**: Clear structure, easy to find and modify code
6. **Team Collaboration**: Different developers can work on different types
7. **Performance**: Only load components for selected type

---

## 🚀 Next Steps

1. **Create pricing component directory structure**
2. **Extract RentalPricing** (refactor existing code)
3. **Implement FreelancePricing** (including UGC features)
4. **Wire up form state** (add all setters to actions)
5. **Add validation** (for each type)
6. **Update Step6Review** (type-specific summaries)
7. **Test thoroughly** (each type independently)

---

## 📚 Additional Resources

- UGC Creator Market Research: [Include links if available]
- Subscription Model Best Practices: [Include links if available]
- Auction Platform Patterns: [Include links if available]

---

**Last Updated**: [Current Date]
**Status**: Planning Phase
**Next Review**: After Phase 2 completion

