/**
 * Recurring Booking Manager
 * Allows creating and managing recurring appointments
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RecurringBookingFormProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (pattern: {
    recurrencePattern: 'daily' | 'weekly' | 'monthly';
    recurrenceEndDate: string;
    numberOfOccurrences?: number;
  }) => void;
  initialDate: string;
  initialStartTime: string;
  initialEndTime: string;
}

export const RecurringBookingForm: React.FC<RecurringBookingFormProps> = ({
  visible,
  onClose,
  onConfirm,
  initialDate,
  initialStartTime,
  initialEndTime,
}) => {
  const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [endDate, setEndDate] = useState('');
  const [numberOfOccurrences, setNumberOfOccurrences] = useState('');

  const handleConfirm = () => {
    if (!endDate && !numberOfOccurrences) {
      Alert.alert('Error', 'Please specify either end date or number of occurrences');
      return;
    }

    onConfirm({
      recurrencePattern,
      recurrenceEndDate: endDate || calculateEndDate(),
      numberOfOccurrences: numberOfOccurrences ? parseInt(numberOfOccurrences) : undefined,
    });
    onClose();
  };

  const calculateEndDate = (): string => {
    const start = new Date(initialDate);
    const occurrences = numberOfOccurrences ? parseInt(numberOfOccurrences) : 12;
    
    if (recurrencePattern === 'daily') {
      start.setDate(start.getDate() + occurrences);
    } else if (recurrencePattern === 'weekly') {
      start.setDate(start.getDate() + (occurrences * 7));
    } else if (recurrencePattern === 'monthly') {
      start.setMonth(start.getMonth() + occurrences);
    }
    
    return start.toISOString().split('T')[0];
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Recurring Booking</Text>
          <Pressable onPress={handleConfirm}>
            <Text style={styles.confirmText}>Confirm</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.label}>Repeat Pattern</Text>
            <View style={styles.patternButtons}>
              {(['daily', 'weekly', 'monthly'] as const).map((pattern) => (
                <Pressable
                  key={pattern}
                  style={[
                    styles.patternButton,
                    recurrencePattern === pattern && styles.patternButtonActive
                  ]}
                  onPress={() => setRecurrencePattern(pattern)}
                >
                  <Text style={[
                    styles.patternText,
                    recurrencePattern === pattern && styles.patternTextActive
                  ]}>
                    {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>End Date (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={endDate}
              onChangeText={setEndDate}
            />
            <Text style={styles.hint}>Leave empty to use number of occurrences</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Number of Occurrences (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 12"
              value={numberOfOccurrences}
              onChangeText={setNumberOfOccurrences}
              keyboardType="numeric"
            />
            <Text style={styles.hint}>Leave empty to use end date</Text>
          </View>

          <View style={styles.preview}>
            <Text style={styles.previewTitle}>Preview:</Text>
            <Text style={styles.previewText}>
              Booking will repeat {recurrencePattern} starting from {new Date(initialDate).toLocaleDateString()}
            </Text>
            {endDate && (
              <Text style={styles.previewText}>
                Until: {new Date(endDate).toLocaleDateString()}
              </Text>
            )}
            {numberOfOccurrences && (
              <Text style={styles.previewText}>
                For {numberOfOccurrences} occurrences
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cancelText: {
    fontSize: 16,
    color: '#6b7280',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  confirmText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  patternButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  patternButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  patternButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  patternText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  patternTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  preview: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    color: '#0C4A6E',
    marginBottom: 4,
  },
});
