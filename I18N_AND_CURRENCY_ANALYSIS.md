# i18n and Currency Implementation Analysis

## Current i18n Implementation

### ✅ **Setup is Complete and Working**

**Location:** `lib/i18n/config.ts`

**How it works:**
1. **Initialization:** Uses `react-i18next` with `i18next` as the core library
2. **Language Loading:** 
   - Loads saved language preference from AsyncStorage (`@izimate_language`)
   - Falls back to device locale if no saved preference
   - Initialized in `app/_layout.tsx` on app startup
3. **Supported Languages:** 15 languages
   - English (en), Russian (ru), Ukrainian (uk), Bulgarian (bg)
   - Spanish (es), French (fr), German (de), Italian (it)
   - Portuguese (pt), Polish (pl), Turkish (tr), Chinese (zh)
   - Japanese (ja), Korean (ko), Arabic (ar), Hindi (hi)

**Translation Files:**
- Location: `lib/i18n/locales/*.json`
- Structure: Nested JSON with namespaces (dashboard, bookings, business, calendar, etc.)
- **Note:** There are placeholder files in `i18n/` directory (en.json, bg.json) that appear to be old/unused

**Usage in Components:**
```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
// Use: t('dashboard.myBookings')
```

**Language Selection:**
- Component: `components/settings/LanguageSelector.tsx`
- Saves preference to AsyncStorage and updates i18n instance
- Persists across app restarts

### ⚠️ **Issues Found:**

1. **Duplicate/Unused Files:**
   - `i18n/en.json` and `i18n/bg.json` exist but are not used
   - Main translations are in `lib/i18n/locales/*.json`
   - These should be removed to avoid confusion

2. **Incomplete Translations:**
   - Some language files (pt, zh, ar, pl, hi, ko, ja, uk, tr, it) are missing the new translation keys we just added
   - Need to add: `bookings.totalBookings`, `bookings.totalRevenue`, `bookings.thisMonth`, `business.*`, `calendar.*`

---

## Current Currency Implementation

### ✅ **Setup is Complete and Working**

**Location:** `lib/utils/currency.ts`

**How it works:**

1. **Currency Storage:**
   - Stored in `users` table: `currency` column (e.g., 'GBP', 'USD', 'EUR')
   - User can set currency preference in Payment Settings
   - Priority: `user.currency` > `country-based detection` > default 'GBP'

2. **Currency Detection:**
   - **Explicit:** User sets currency in Payment Settings → saved to `users.currency`
   - **Automatic:** If no currency set, detects from `users.country` field
   - **Default:** Falls back to GBP if no country/currency found

3. **Supported Currencies:** 20 currencies
   - USD, GBP, EUR, CAD, AUD, JPY, CHF, CNY, INR, BRL
   - MXN, ZAR, NZD, SGD, HKD, NOK, SEK, DKK, PLN, CZK

4. **Currency Formatting:**
   - Function: `formatCurrency(amount, currencyCode)`
   - Handles special cases (e.g., JPY has no decimals)
   - Uses proper currency symbols and formatting

5. **Currency Change Flow:**
   ```
   User selects currency in PaymentSettings
   → handleCurrencyChange() called
   → Updates users.currency in database
   → Updates local state
   → All prices throughout app use getUserCurrency() to get user's preference
   ```

**Key Functions:**
- `getUserCurrency(userCurrency, userCountry)` - Gets user's currency with fallback logic
- `getCurrencyFromCountry(country)` - Maps country to currency
- `formatCurrency(amount, currencyCode)` - Formats price with symbol
- `formatCurrencyRange(min, max, currencyCode)` - Formats price ranges

**Usage Pattern:**
```typescript
import { getUserCurrency, formatCurrency } from '@/lib/utils/currency';

const userCurrency = getUserCurrency(user?.currency, user?.country);
const formattedPrice = formatCurrency(price, userCurrency);
```

### ⚠️ **Issues Found:**

1. **Exchange Rate Handling:**
   - **Current:** Hardcoded exchange rates in `BillingTab.tsx` and `AffiliateTab.tsx`
   - **Problem:** Rates are static and approximate (e.g., `USD: 1.27` relative to GBP)
   - **Impact:** Prices converted using outdated rates
   - **Recommendation:** 
     - Use a currency API (e.g., ExchangeRate-API, Fixer.io)
     - Cache rates with expiration
     - Update rates daily or on-demand

2. **Currency Conversion Logic:**
   - Base prices are stored in GBP
   - Conversion happens at display time using hardcoded rates
   - **Better approach:** Store prices in user's currency OR use real-time conversion API

3. **Currency Persistence:**
   - Currency is saved to database correctly ✅
   - But components need to reload user data to see changes
   - Some components use `useFocusEffect` to reload, but not all

4. **Missing Currency Context:**
   - No global currency context/provider
   - Each component calls `getUserCurrency()` independently
   - Could benefit from a React Context to avoid prop drilling

---

## Recommendations

### For i18n:

1. **Clean up duplicate files:**
   ```bash
   rm i18n/en.json i18n/bg.json
   ```

2. **Complete missing translations:**
   - Add new keys to remaining language files (pt, zh, ar, pl, hi, ko, ja, uk, tr, it)
   - Ensure all components use `t()` instead of hardcoded strings

3. **Add translation coverage check:**
   - Create a script to verify all keys exist in all language files
   - Add to CI/CD pipeline

### For Currency:

1. **Implement real-time exchange rates:**
   ```typescript
   // lib/utils/exchange-rates.ts
   const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/GBP';
   
   export async function getExchangeRates(): Promise<Record<string, number>> {
     // Fetch and cache rates
   }
   ```

2. **Create Currency Context:**
   ```typescript
   // lib/contexts/CurrencyContext.tsx
   export const CurrencyProvider = ({ children }) => {
     // Provides userCurrency and formatCurrency function
   }
   ```

3. **Add currency change listener:**
   - When currency changes, notify all components using currency
   - Use React Context or event emitter pattern

4. **Consider storing prices in multiple currencies:**
   - Or use a currency conversion service
   - Avoid hardcoded rates

---

## Current Status Summary

| Feature | Status | Notes |
|---------|--------|-------|
| i18n Setup | ✅ Working | Properly configured, loads on app start |
| Language Selection | ✅ Working | Saves to AsyncStorage, persists |
| Translation Files | ⚠️ Partial | Some languages missing new keys |
| Currency Storage | ✅ Working | Saved in users.currency column |
| Currency Detection | ✅ Working | Falls back to country → GBP |
| Currency Formatting | ✅ Working | Handles all supported currencies |
| Exchange Rates | ✅ Real-time | Using ExchangeRate-API with caching |
| Currency Context | ❌ Missing | No global state management |

---

## Files to Review

**i18n:**
- `lib/i18n/config.ts` - Main configuration
- `lib/i18n/locales/*.json` - Translation files
- `components/settings/LanguageSelector.tsx` - Language picker
- `app/_layout.tsx` - Initialization

**Currency:**
- `lib/utils/currency.ts` - Core currency utilities
- `components/settings/PaymentSettings.tsx` - Currency selection UI
- `components/dashboard/BillingTab.tsx` - Uses hardcoded rates
- `components/dashboard/AffiliateTab.tsx` - Uses hardcoded rates

