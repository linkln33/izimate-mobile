# iZimate Job - Subscription Pricing Tiers

## Overview

iZimate Job offers three subscription tiers designed to meet the needs of different users, from casual customers to professional businesses.

---

## 📋 Subscription Plans

### 🆓 Free Plan - £0.00/month

**Perfect for:** Casual users who want to purchase, book, or hire services

**Features:**
- ✅ Purchase, book, or hire services
- ✅ Create up to 10 listings as customer
- ✅ Basic platform access

**Limitations:**
- Limited to 10 active listings
- No affiliate program access
- No business verification
- No priority support

---

### ⭐ Pro Plan - £9.95/month

**Perfect for:** Active users who want to grow their presence and earn through referrals

**Features:**
- ✅ All Free plan features
- ✅ Create up to 50 listings
- ✅ Refer users as affiliate (earn commissions)
- ✅ Verify as business and provide business services
- ✅ Enhanced platform access

**Benefits:**
- 5x more listings than Free plan
- Affiliate program access
- Business verification eligibility
- Professional service capabilities

---

### 🏢 Business Plan - £29.95/month

**Perfect for:** Professional businesses and service providers who need maximum visibility and features

**Features:**
- ✅ Unlimited listings
- ✅ 24/7 support
- ✅ Custom domain name
- ✅ Priority in search results
- ✅ Business badge
- ✅ All Pro plan features

**Benefits:**
- Unlimited listing creation
- Maximum visibility with priority search ranking
- Professional branding with custom domain
- Dedicated 24/7 support
- Verified business badge for trust

---

## 💰 Pricing Details

| Plan | Monthly Price (GBP) | Listing Limit | Key Features |
|------|---------------------|---------------|--------------|
| **Free** | £0.00 | 10 listings | Basic access |
| **Pro** | £9.95 | 50 listings | Affiliate, Business verification |
| **Business** | £29.95 | Unlimited | Custom domain, Priority search, Badge |

---

## 🔄 Plan Comparison

### Listing Limits
- **Free:** 10 listings
- **Pro:** 50 listings
- **Business:** Unlimited listings

### Affiliate Program
- **Free:** ❌ Not available
- **Pro:** ✅ Available
- **Business:** ✅ Available

### Business Verification
- **Free:** ❌ Not available
- **Pro:** ✅ Available
- **Business:** ✅ Included

### Support
- **Free:** Standard support
- **Pro:** Standard support
- **Business:** 24/7 priority support

### Additional Features
- **Free:** Basic features only
- **Pro:** Affiliate program, Business verification
- **Business:** Custom domain, Priority search, Business badge

---

## 📝 Implementation Notes

### Listing Limits Enforcement
- Listing limits are enforced based on active subscription plan
- Limits apply to active, matched, and in-progress listings
- Completed or cancelled listings don't count toward limit

### Subscription Management
- Subscriptions are managed through Stripe
- Users can upgrade/downgrade at any time
- Changes take effect immediately
- Prorated billing for mid-cycle changes

### Feature Access
- Features are enabled/disabled based on subscription plan
- Plan changes are reflected immediately in the UI
- Some features may require additional verification (e.g., business verification)

---

## 🎯 Revenue Model

iZimate Job operates on a **subscription-based revenue model**:

- **No payment processing fees** - Platform acts as a middleman, facilitating connections
- **No escrow services** - Customers pay providers directly
- **Revenue sources:**
  1. Monthly subscription fees (Free: £0, Pro: £9.95, Business: £29.95)
  2. Affiliate commissions (Pro and Business users can refer others)
  3. Optional premium features (future)

---

## 📅 Last Updated

**Date:** December 2024  
**Version:** 1.0

---

## 🔗 Related Documentation

- `components/dashboard/BillingTab.tsx` - Subscription UI component
- `lib/utils/listings.ts` - Listing quota enforcement
- `lib/types.ts` - Subscription type definitions

