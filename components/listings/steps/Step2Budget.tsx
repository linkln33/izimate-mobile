import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ListingFormState, ListingFormActions } from '../useListingForm'

interface Step2BudgetProps {
  formState: ListingFormState
  formActions: ListingFormActions
}

export function Step2Budget({ formState, formActions }: Step2BudgetProps) {
  const {
    budgetType,
    budgetMin,
    budgetMax,
    urgency,
    preferredDate,
  } = formState

  const {
    setBudgetType,
    setBudgetMin,
    setBudgetMax,
    setUrgency,
    setPreferredDate,
  } = formActions

  return (
    <View>
      <Text style={styles.stepTitle}>Budget & Urgency</Text>

      {/* Budget Type */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Budget Type</Text>
        <View style={styles.budgetTypeButtons}>
          {(['fixed', 'range', 'hourly'] as const).map((type) => (
            <Pressable
              key={type}
              style={[
                styles.budgetTypeButton,
                budgetType === type && styles.budgetTypeButtonActive,
              ]}
              onPress={() => setBudgetType(type)}
            >
              <Text
                style={[
                  styles.budgetTypeButtonText,
                  budgetType === type && styles.budgetTypeButtonTextActive,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Budget Min */}
      {budgetType !== 'hourly' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Minimum Budget (£)</Text>
          <TextInput
            style={styles.input}
            value={budgetMin}
            onChangeText={setBudgetMin}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
      )}

      {/* Budget Max */}
      {budgetType === 'range' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Maximum Budget (£)</Text>
          <TextInput
            style={styles.input}
            value={budgetMax}
            onChangeText={setBudgetMax}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
      )}

      {/* Urgency */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Urgency</Text>
        <View style={styles.urgencyButtons}>
          {(['asap', 'this_week', 'flexible'] as const).map((urg) => (
            <Pressable
              key={urg}
              style={[
                styles.urgencyButton,
                urgency === urg && styles.urgencyButtonActive,
              ]}
              onPress={() => setUrgency(urg)}
            >
              <Text
                style={[
                  styles.urgencyButtonText,
                  urgency === urg && styles.urgencyButtonTextActive,
                ]}
              >
                {urg === 'asap' ? 'ASAP' : urg === 'this_week' ? 'This Week' : 'Flexible'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Preferred Date */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Preferred Date</Text>
        <TextInput
          style={styles.input}
          value={preferredDate}
          onChangeText={setPreferredDate}
          placeholder="YYYY-MM-DD"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  budgetTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  budgetTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  budgetTypeButtonActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#f25842',
  },
  budgetTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  budgetTypeButtonTextActive: {
    color: '#f25842',
    fontWeight: '600',
  },
  urgencyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  urgencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  urgencyButtonActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#f25842',
  },
  urgencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  urgencyButtonTextActive: {
    color: '#f25842',
    fontWeight: '600',
  },
})
