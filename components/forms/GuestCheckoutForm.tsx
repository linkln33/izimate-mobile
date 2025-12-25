/**
 * Guest Checkout Form Example
 * Demonstrates React Hook Form + Zod integration
 * This is a reference implementation for migrating other forms
 */

import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native'
import { TextInput, Button } from 'react-native-paper'
import { colors, spacing, borderRadius } from '@/lib/theme'

// Validation schema using Zod
const guestInfoSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
})

type GuestInfoFormData = z.infer<typeof guestInfoSchema>

interface GuestCheckoutFormProps {
  onSubmit: (data: GuestInfoFormData) => Promise<void>
  loading?: boolean
}

export const GuestCheckoutForm: React.FC<GuestCheckoutFormProps> = ({
  onSubmit,
  loading = false,
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GuestInfoFormData>({
    resolver: zodResolver(guestInfoSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      notes: '',
      agreedToTerms: false,
    },
  })

  const onFormSubmit = async (data: GuestInfoFormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      Alert.alert('Error', 'Failed to submit form. Please try again.')
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Full Name *"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={!!errors.name}
              style={styles.input}
              mode="outlined"
            />
          )}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Email Address *"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={!!errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              mode="outlined"
            />
          )}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Phone Number *"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={!!errors.phone}
              keyboardType="phone-pad"
              style={styles.input}
              mode="outlined"
            />
          )}
        />
        {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}

        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Additional Notes (Optional)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={!!errors.notes}
              multiline
              numberOfLines={4}
              style={styles.input}
              mode="outlined"
            />
          )}
        />
        {errors.notes && <Text style={styles.errorText}>{errors.notes.message}</Text>}

        <Button
          mode="contained"
          onPress={handleSubmit(onFormSubmit)}
          loading={isSubmitting || loading}
          disabled={isSubmitting || loading}
          style={styles.submitButton}
        >
          Continue
        </Button>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  form: {
    padding: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.xl,
    borderRadius: borderRadius.lg,
  },
})

