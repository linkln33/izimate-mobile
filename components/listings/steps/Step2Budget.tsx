import { View, Text, StyleSheet, ScrollView } from 'react-native'
import type { ListingFormState, ListingFormActions } from '../useListingForm'
import {
  RentalPricing,
  StandardPricing,
  ExperiencePricing,
  DigitalServicesPricing,
  FundraisingPricing,
  TransportationPricing,
  GatedContentPricing,
} from '../pricing'

interface Step2BudgetProps {
  formState: ListingFormState
  formActions: ListingFormActions
}

export function Step2Budget({ formState, formActions }: Step2BudgetProps) {
  const { listing_type } = formState

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Services & Pricing</Text>
      <Text style={styles.stepSubtitle}>
        Choose how you want to price your {listing_type || 'service'}
      </Text>

      {/* Route to appropriate pricing component based on listing type */}
      {listing_type === 'rental' && <RentalPricing formState={formState} formActions={formActions} />}
      {listing_type === 'experience' && <ExperiencePricing formState={formState} formActions={formActions} />}
      {listing_type === 'digital_services' && <DigitalServicesPricing formState={formState} formActions={formActions} />}
      {listing_type === 'fundraising' && <FundraisingPricing formState={formState} formActions={formActions} />}
      {listing_type === 'transportation' && <TransportationPricing formState={formState} formActions={formActions} />}
      {listing_type === 'gated_content' && <GatedContentPricing formState={formState} formActions={formActions} />}
      {(listing_type === 'service' || listing_type === 'goods' || !listing_type) && (
        <StandardPricing formState={formState} formActions={formActions} />
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
})
