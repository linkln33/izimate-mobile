/**
 * ServiceSelector Component
 * Displays and handles service selection for booking
 */

import React, { useState, useEffect } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { slotCalculator } from '@/lib/utils/slot-calculator'
import { getCurrencySymbol } from '@/lib/utils/currency'
import type { ServiceSelectorProps, ServiceOption } from './types'

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  listingId,
  selectedService,
  onServiceSelect,
  budgetType,
  priceList = [],
  currency = 'GBP',
}) => {
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([])

  useEffect(() => {
    loadServiceOptions()
  }, [listingId, budgetType, priceList])

  const loadServiceOptions = async () => {
    try {
      if (budgetType === 'price_list' && priceList.length > 0) {
        // Convert price_list to ServiceOption format
        const options: ServiceOption[] = priceList.map(item => ({
          id: item.id,
          name: item.serviceName,
          price: parseFloat(item.price),
          currency: currency,
          duration: 60, // Default duration, can be enhanced
        }))
        setServiceOptions(options)

        // Auto-select if only one option
        if (options.length === 1 && !selectedService) {
          onServiceSelect(options[0])
        }
      } else {
        // Load from slotCalculator for other budget types
        const options = await slotCalculator.getServiceOptions(listingId)
        setServiceOptions(options)

        // Auto-select if only one option
        if (options.length === 1 && !selectedService) {
          onServiceSelect(options[0])
        }
      }
    } catch (error) {
      console.error('Failed to load service options:', error)
      setServiceOptions([])
    }
  }

  if (serviceOptions.length <= 1) {
    // Don't show selector if only one or no options
    return null
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Service</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.serviceList}
      >
        {serviceOptions.map((service, index) => {
          const isSelected =
            selectedService?.name === service.name ||
            selectedService?.id === service.id

          return (
            <Pressable
              key={service.id || `service-${index}`}
              style={[
                styles.serviceOption,
                isSelected && styles.serviceOptionSelected,
                service.color &&
                  isSelected && {
                    backgroundColor: service.color + '20',
                    borderColor: service.color,
                  },
              ]}
              onPress={() => onServiceSelect(service)}
            >
              <Text
                style={[
                  styles.serviceName,
                  isSelected && styles.serviceNameSelected,
                  service.color &&
                    isSelected && {
                      color: service.color,
                    },
                ]}
              >
                {service.name}
              </Text>
              <Text
                style={[
                  styles.serviceDetails,
                  isSelected && styles.serviceDetailsSelected,
                ]}
              >
                {service.duration}min •{' '}
                {getCurrencySymbol(service.currency || currency)}
                {service.price}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  serviceList: {
    paddingBottom: 8,
  },
  serviceOption: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  serviceOptionSelected: {
    borderColor: '#f25842',
    backgroundColor: '#fef2f2',
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  serviceNameSelected: {
    color: '#f25842',
  },
  serviceDetails: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  serviceDetailsSelected: {
    color: '#f25842',
  },
})

