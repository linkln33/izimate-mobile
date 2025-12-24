/**
 * Coupon/Discount Code Manager
 * Allows providers to create and manage discount codes
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

interface Coupon {
  id: string;
  code: string;
  title: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  valid_from: string;
  valid_until: string;
  max_uses: number;
  current_uses: number;
  min_booking_amount: number;
  is_active: boolean;
}

interface CouponManagerProps {
  providerId: string;
  listingId?: string;
}

export const CouponManager: React.FC<CouponManagerProps> = ({
  providerId,
  listingId,
}) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed_amount',
    discountValue: '',
    validFrom: '',
    validUntil: '',
    maxUses: '',
    minBookingAmount: '',
  });

  useEffect(() => {
    loadCoupons();
  }, [providerId, listingId]);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('booking_coupons')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (listingId) {
        query = query.eq('listing_id', listingId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCoupons((data || []) as Coupon[]);
    } catch (error) {
      console.error('Failed to load coupons:', error);
      Alert.alert('Error', 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const generateCouponCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const handleCreateCoupon = async () => {
    if (!formData.code || !formData.title || !formData.discountValue) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('booking_coupons')
        .insert({
          provider_id: providerId,
          listing_id: listingId || null,
          code: formData.code.toUpperCase(),
          title: formData.title,
          description: formData.description,
          discount_type: formData.discountType,
          discount_value: parseFloat(formData.discountValue),
          valid_from: formData.validFrom || null,
          valid_until: formData.validUntil || null,
          max_uses: formData.maxUses ? parseInt(formData.maxUses) : null,
          min_booking_amount: formData.minBookingAmount ? parseFloat(formData.minBookingAmount) : null,
          is_active: true,
        });

      if (error) throw error;

      Alert.alert('Success', 'Coupon created successfully');
      setShowAddModal(false);
      resetForm();
      await loadCoupons();
    } catch (error: any) {
      console.error('Failed to create coupon:', error);
      if (error.code === '23505') {
        Alert.alert('Error', 'Coupon code already exists');
      } else {
        Alert.alert('Error', 'Failed to create coupon');
      }
    }
  };

  const handleToggleCoupon = async (couponId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('booking_coupons')
        .update({ is_active: !isActive })
        .eq('id', couponId);

      if (error) throw error;
      await loadCoupons();
    } catch (error) {
      console.error('Failed to toggle coupon:', error);
      Alert.alert('Error', 'Failed to update coupon');
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    Alert.alert(
      'Delete Coupon',
      'Are you sure you want to delete this coupon?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('booking_coupons')
                .delete()
                .eq('id', couponId);

              if (error) throw error;
              await loadCoupons();
            } catch (error) {
              console.error('Failed to delete coupon:', error);
              Alert.alert('Error', 'Failed to delete coupon');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      code: '',
      title: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      validFrom: '',
      validUntil: '',
      maxUses: '',
      minBookingAmount: '',
    });
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% OFF`;
    } else {
      return `£${coupon.discount_value} OFF`;
    }
  };

  const isCouponValid = (coupon: Coupon) => {
    if (!coupon.is_active) return false;
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) return false;
    if (coupon.valid_until && new Date(coupon.valid_until) < now) return false;
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) return false;
    return true;
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
        <Text style={styles.title}>Discount Codes</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Create</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.list}>
        {coupons.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pricetag-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No discount codes</Text>
            <Text style={styles.emptySubtext}>Create codes to offer discounts to customers</Text>
          </View>
        ) : (
          coupons.map((coupon) => (
            <View key={coupon.id} style={styles.couponCard}>
              <View style={styles.couponHeader}>
                <View style={styles.couponInfo}>
                  <View style={styles.codeContainer}>
                    <Text style={styles.couponCode}>{coupon.code}</Text>
                    {!isCouponValid(coupon) && (
                      <View style={styles.invalidBadge}>
                        <Text style={styles.invalidText}>Invalid</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.couponTitle}>{coupon.title}</Text>
                  {coupon.description && (
                    <Text style={styles.couponDescription}>{coupon.description}</Text>
                  )}
                </View>
                <View style={[styles.discountBadge, { backgroundColor: '#10b981' + '20' }]}>
                  <Text style={[styles.discountText, { color: '#10b981' }]}>
                    {formatDiscount(coupon)}
                  </Text>
                </View>
              </View>

              <View style={styles.couponDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Uses:</Text>
                  <Text style={styles.detailValue}>
                    {coupon.current_uses} / {coupon.max_uses || '∞'}
                  </Text>
                </View>
                {coupon.valid_from && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Valid from:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(coupon.valid_from).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                {coupon.valid_until && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Valid until:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(coupon.valid_until).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                {coupon.min_booking_amount && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Min. booking:</Text>
                    <Text style={styles.detailValue}>£{coupon.min_booking_amount}</Text>
                  </View>
                )}
              </View>

              <View style={styles.actionsContainer}>
                <Pressable
                  style={[styles.toggleButton, coupon.is_active ? styles.toggleButtonActive : styles.toggleButtonInactive]}
                  onPress={() => handleToggleCoupon(coupon.id, coupon.is_active)}
                >
                  <Ionicons 
                    name={coupon.is_active ? 'checkmark-circle' : 'close-circle'} 
                    size={18} 
                    color={coupon.is_active ? '#10b981' : '#6b7280'} 
                  />
                  <Text style={[styles.toggleText, coupon.is_active ? styles.toggleTextActive : styles.toggleTextInactive]}>
                    {coupon.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDeleteCoupon(coupon.id)}
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
            <Text style={styles.modalTitle}>Create Coupon</Text>
            <Pressable onPress={handleCreateCoupon}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <View style={styles.codeInputContainer}>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="COUPON CODE"
                  value={formData.code}
                  onChangeText={(text) => setFormData({ ...formData, code: text.toUpperCase() })}
                  autoCapitalize="characters"
                />
                <Pressable style={styles.generateButton} onPress={generateCouponCode}>
                  <Text style={styles.generateButtonText}>Generate</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Summer Sale"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Optional description"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Discount Type</Text>
              <View style={styles.typeButtons}>
                <Pressable
                  style={[styles.typeButton, formData.discountType === 'percentage' && styles.typeButtonActive]}
                  onPress={() => setFormData({ ...formData, discountType: 'percentage' })}
                >
                  <Text style={[styles.typeButtonText, formData.discountType === 'percentage' && styles.typeButtonTextActive]}>
                    Percentage
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.typeButton, formData.discountType === 'fixed_amount' && styles.typeButtonActive]}
                  onPress={() => setFormData({ ...formData, discountType: 'fixed_amount' })}
                >
                  <Text style={[styles.typeButtonText, formData.discountType === 'fixed_amount' && styles.typeButtonTextActive]}>
                    Fixed Amount
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Discount Value *</Text>
              <TextInput
                style={styles.input}
                placeholder={formData.discountType === 'percentage' ? 'e.g., 20' : 'e.g., 10.00'}
                value={formData.discountValue}
                onChangeText={(text) => setFormData({ ...formData, discountValue: text })}
                keyboardType="numeric"
              />
              <Text style={styles.hint}>
                {formData.discountType === 'percentage' ? 'Enter percentage (e.g., 20 for 20%)' : 'Enter amount in currency'}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Valid From (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.validFrom}
                onChangeText={(text) => setFormData({ ...formData, validFrom: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Valid Until (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.validUntil}
                onChangeText={(text) => setFormData({ ...formData, validUntil: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Max Uses (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Leave empty for unlimited"
                value={formData.maxUses}
                onChangeText={(text) => setFormData({ ...formData, maxUses: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Min. Booking Amount (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 50.00"
                value={formData.minBookingAmount}
                onChangeText={(text) => setFormData({ ...formData, minBookingAmount: text })}
                keyboardType="numeric"
              />
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
  couponCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  couponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  couponInfo: {
    flex: 1,
    marginRight: 12,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  couponCode: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: 2,
  },
  invalidBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  invalidText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ef4444',
  },
  couponTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  couponDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  discountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 14,
    fontWeight: '700',
  },
  couponDetails: {
    gap: 6,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
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
  codeInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  codeInput: {
    flex: 1,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 2,
  },
  generateButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    justifyContent: 'center',
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
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
});
