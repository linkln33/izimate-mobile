/**
 * Auction Pricing Component
 * Handles pricing configuration for auction listings
 */

import { View, Text, TextInput, StyleSheet } from 'react-native'
import type { ListingFormState, ListingFormActions } from '../useListingForm'
import { CURRENCIES, type Currency } from './types'

interface AuctionPricingProps {
  formState: ListingFormState
  formActions: ListingFormActions
}

export function AuctionPricing({ formState, formActions }: AuctionPricingProps) {
  const {
    currency,
    auction_start_price,
    auction_reserve_price,
    auction_bid_increment,
    auction_buy_now_price,
    auction_end_time,
  } = formState

  const {
    setAuctionStartPrice,
    setAuctionReservePrice,
    setAuctionBidIncrement,
    setAuctionBuyNowPrice,
    setAuctionEndTime,
  } = formActions

  const selectedCurrency: Currency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]

  return (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Starting Bid ({selectedCurrency.symbol})</Text>
        <TextInput
          style={styles.input}
          value={auction_start_price || ''}
          onChangeText={setAuctionStartPrice}
          placeholder="e.g., 100"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          The starting price for bids
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Reserve Price ({selectedCurrency.symbol})</Text>
        <TextInput
          style={styles.input}
          value={auction_reserve_price || ''}
          onChangeText={setAuctionReservePrice}
          placeholder="e.g., 200 (optional)"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          The minimum price you are willing to sell for (optional)
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Bid Increment ({selectedCurrency.symbol})</Text>
        <TextInput
          style={styles.input}
          value={auction_bid_increment || ''}
          onChangeText={setAuctionBidIncrement}
          placeholder="e.g., 5"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Minimum amount by which a bid must exceed the previous bid
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Buy Now Price ({selectedCurrency.symbol})</Text>
        <TextInput
          style={styles.input}
          value={auction_buy_now_price || ''}
          onChangeText={setAuctionBuyNowPrice}
          placeholder="e.g., 500 (optional)"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Optional instant purchase price
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Auction End Time</Text>
        <TextInput
          style={styles.input}
          value={auction_end_time || ''}
          onChangeText={setAuctionEndTime}
          placeholder="YYYY-MM-DDTHH:MM (e.g., 2024-12-31T23:59)"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          When the auction closes (ISO datetime format)
        </Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
  },
  inputHelp: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
  },
})

