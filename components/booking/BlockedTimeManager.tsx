/**
 * Blocked Time Manager
 * Allows providers to block off personal time, holidays, and breaks
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface BlockedTime {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  block_type: 'personal' | 'holiday' | 'break' | 'unavailable';
  is_recurring_yearly: boolean;
}

interface BlockedTimeManagerProps {
  providerId: string;
  listingId: string;
}

export const BlockedTimeManager: React.FC<BlockedTimeManagerProps> = ({
  providerId,
  listingId,
}) => {
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    isAllDay: false,
    blockType: 'personal' as 'personal' | 'holiday' | 'break' | 'unavailable',
    isRecurringYearly: false,
  });

  useEffect(() => {
    loadBlockedTimes();
  }, [providerId, listingId]);

  const loadBlockedTimes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('provider_blocked_times')
        .select('*')
        .eq('provider_id', providerId)
        .eq('listing_id', listingId)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setBlockedTimes((data || []) as BlockedTime[]);
    } catch (error) {
      console.error('Failed to load blocked times:', error);
      Alert.alert('Error', 'Failed to load blocked times');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlockedTime = async () => {
    if (!formData.title || !formData.startDate || !formData.endDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const startTime = formData.isAllDay 
        ? `${formData.startDate}T00:00:00`
        : `${formData.startDate}T${formData.startTime}:00`;
      
      const endTime = formData.isAllDay
        ? `${formData.endDate}T23:59:59`
        : `${formData.endDate}T${formData.endTime}:00`;

      const { error } = await supabase
        .from('provider_blocked_times')
        .insert({
          provider_id: providerId,
          listing_id: listingId,
          title: formData.title,
          start_time: startTime,
          end_time: endTime,
          is_all_day: formData.isAllDay,
          block_type: formData.blockType,
          is_recurring_yearly: formData.isRecurringYearly,
        });

      if (error) throw error;

      Alert.alert('Success', 'Blocked time added successfully');
      setShowAddModal(false);
      resetForm();
      await loadBlockedTimes();
    } catch (error) {
      console.error('Failed to add blocked time:', error);
      Alert.alert('Error', 'Failed to add blocked time');
    }
  };

  const handleDeleteBlockedTime = async (id: string) => {
    Alert.alert(
      'Delete Blocked Time',
      'Are you sure you want to remove this blocked time?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('provider_blocked_times')
                .delete()
                .eq('id', id);

              if (error) throw error;

              await loadBlockedTimes();
            } catch (error) {
              console.error('Failed to delete blocked time:', error);
              Alert.alert('Error', 'Failed to delete blocked time');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      title: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      isAllDay: false,
      blockType: 'personal',
      isRecurringYearly: false,
    });
  };

  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBlockTypeColor = (type: string) => {
    switch (type) {
      case 'holiday': return '#ef4444';
      case 'break': return '#f59e0b';
      case 'personal': return '#3b82f6';
      case 'unavailable': return '#6b7280';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Blocked Time</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.list}>
        {blockedTimes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No blocked times</Text>
            <Text style={styles.emptySubtext}>Add personal time, holidays, or breaks</Text>
          </View>
        ) : (
          blockedTimes.map((block) => (
            <View key={block.id} style={styles.blockCard}>
              <View style={styles.blockHeader}>
                <View style={[styles.typeBadge, { backgroundColor: getBlockTypeColor(block.block_type) + '20' }]}>
                  <Text style={[styles.typeText, { color: getBlockTypeColor(block.block_type) }]}>
                    {block.block_type.charAt(0).toUpperCase() + block.block_type.slice(1)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDeleteBlockedTime(block.id)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </Pressable>
              </View>
              <Text style={styles.blockTitle}>{block.title}</Text>
              <Text style={styles.blockTime}>
                {formatDateTime(block.start_time)} - {formatDateTime(block.end_time)}
              </Text>
              {block.is_recurring_yearly && (
                <View style={styles.recurringBadge}>
                  <Ionicons name="repeat" size={12} color="#10b981" />
                  <Text style={styles.recurringText}>Recurring yearly</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Block Time</Text>
            <Pressable onPress={handleAddBlockedTime}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Holiday, Personal Time"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeButtons}>
                {['personal', 'holiday', 'break', 'unavailable'].map((type) => (
                  <Pressable
                    key={type}
                    style={[
                      styles.typeButton,
                      formData.blockType === type && styles.typeButtonActive
                    ]}
                    onPress={() => setFormData({ ...formData, blockType: type as any })}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      formData.blockType === type && styles.typeButtonTextActive
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Start Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.startDate}
                onChangeText={(text) => setFormData({ ...formData, startDate: text })}
              />
            </View>

            {!formData.isAllDay && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Start Time</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM"
                  value={formData.startTime}
                  onChangeText={(text) => setFormData({ ...formData, startTime: text })}
                />
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>End Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.endDate}
                onChangeText={(text) => setFormData({ ...formData, endDate: text })}
              />
            </View>

            {!formData.isAllDay && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>End Time</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM"
                  value={formData.endTime}
                  onChangeText={(text) => setFormData({ ...formData, endTime: text })}
                />
              </View>
            )}

            <View style={styles.formGroup}>
              <Pressable
                style={styles.checkbox}
                onPress={() => setFormData({ ...formData, isAllDay: !formData.isAllDay })}
              >
                <Ionicons
                  name={formData.isAllDay ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={formData.isAllDay ? '#007AFF' : '#666'}
                />
                <Text style={styles.checkboxLabel}>All Day</Text>
              </Pressable>
            </View>

            <View style={styles.formGroup}>
              <Pressable
                style={styles.checkbox}
                onPress={() => setFormData({ ...formData, isRecurringYearly: !formData.isRecurringYearly })}
              >
                <Ionicons
                  name={formData.isRecurringYearly ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={formData.isRecurringYearly ? '#007AFF' : '#666'}
                />
                <Text style={styles.checkboxLabel}>Recurring Yearly (e.g., Christmas)</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  blockCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  blockTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  recurringText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  saveText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
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
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#374151',
  },
});
