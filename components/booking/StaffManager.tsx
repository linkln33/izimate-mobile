/**
 * Staff Management Component
 * Allows providers to manage staff members, their hours, and service assignments
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

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  working_hours: any;
  assigned_services: string[];
  time_off: any[];
  is_active: boolean;
  user_id: string;
}

interface StaffManagerProps {
  providerId: string;
}

export const StaffManager: React.FC<StaffManagerProps> = ({
  providerId,
}) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'staff',
  });

  useEffect(() => {
    loadStaff();
  }, [providerId]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaff((data || []) as StaffMember[]);
    } catch (error) {
      console.error('Failed to load staff:', error);
      Alert.alert('Error', 'Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!formData.name) {
      Alert.alert('Error', 'Please enter staff name');
      return;
    }

    try {
      // First, try to find user by email if provided
      let userId = null;
      if (formData.email) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', formData.email)
          .single();
        
        if (userData) {
          userId = userData.id;
        }
      }

      const { error } = await supabase
        .from('staff_members')
        .insert({
          provider_id: providerId,
          user_id: userId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          is_active: true,
        });

      if (error) throw error;

      Alert.alert('Success', 'Staff member added successfully');
      setShowAddModal(false);
      resetForm();
      await loadStaff();
    } catch (error: any) {
      console.error('Failed to add staff:', error);
      if (error.code === '23505') {
        Alert.alert('Error', 'Staff member already exists');
      } else {
        Alert.alert('Error', 'Failed to add staff member');
      }
    }
  };

  const handleToggleStaff = async (staffId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('staff_members')
        .update({ is_active: !isActive })
        .eq('id', staffId);

      if (error) throw error;
      await loadStaff();
    } catch (error) {
      console.error('Failed to toggle staff:', error);
      Alert.alert('Error', 'Failed to update staff member');
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    Alert.alert(
      'Delete Staff Member',
      'Are you sure you want to remove this staff member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('staff_members')
                .delete()
                .eq('id', staffId);

              if (error) throw error;
              await loadStaff();
            } catch (error) {
              console.error('Failed to delete staff:', error);
              Alert.alert('Error', 'Failed to delete staff member');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'staff',
    });
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
        <Text style={styles.title}>Staff Management</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Staff</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.list}>
        {staff.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No staff members</Text>
            <Text style={styles.emptySubtext}>Add staff members to assign services and manage schedules</Text>
          </View>
        ) : (
          staff.map((member) => (
            <View key={member.id} style={styles.staffCard}>
              <View style={styles.staffHeader}>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{member.name}</Text>
                  <Text style={styles.staffRole}>{member.role}</Text>
                  {member.email && (
                    <Text style={styles.staffEmail}>{member.email}</Text>
                  )}
                  {member.phone && (
                    <Text style={styles.staffPhone}>{member.phone}</Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: member.is_active ? '#10b98120' : '#6b728020' }]}>
                  <Text style={[styles.statusText, { color: member.is_active ? '#10b981' : '#6b7280' }]}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              {member.assigned_services && member.assigned_services.length > 0 && (
                <View style={styles.servicesSection}>
                  <Text style={styles.servicesLabel}>Assigned Services:</Text>
                  <View style={styles.servicesList}>
                    {member.assigned_services.map((service, index) => (
                      <View key={index} style={styles.serviceTag}>
                        <Text style={styles.serviceTagText}>{service}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.actionsContainer}>
                <Pressable
                  style={[styles.toggleButton, member.is_active ? styles.toggleButtonActive : styles.toggleButtonInactive]}
                  onPress={() => handleToggleStaff(member.id, member.is_active)}
                >
                  <Ionicons 
                    name={member.is_active ? 'checkmark-circle' : 'close-circle'} 
                    size={18} 
                    color={member.is_active ? '#10b981' : '#6b7280'} 
                  />
                  <Text style={[styles.toggleText, member.is_active ? styles.toggleTextActive : styles.toggleTextInactive]}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDeleteStaff(member.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </Pressable>
              </View>
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
            <Text style={styles.modalTitle}>Add Staff Member</Text>
            <Pressable onPress={handleAddStaff}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Staff member name"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="email@example.com"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.hint}>Link to existing user account (optional)</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="+44 123 456 7890"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Role</Text>
              <View style={styles.roleButtons}>
                {['staff', 'manager', 'admin'].map((role) => (
                  <Pressable
                    key={role}
                    style={[styles.roleButton, formData.role === role && styles.roleButtonActive]}
                    onPress={() => setFormData({ ...formData, role })}
                  >
                    <Text style={[styles.roleButtonText, formData.role === role && styles.roleButtonTextActive]}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
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
    textAlign: 'center',
  },
  staffCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  staffRole: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  staffEmail: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 2,
  },
  staffPhone: {
    fontSize: 13,
    color: '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  servicesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  servicesLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  servicesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  serviceTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  serviceTagText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleButtonActive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  toggleButtonInactive: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#10b981',
  },
  toggleTextInactive: {
    color: '#6b7280',
  },
  deleteButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
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
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
});
