/**
 * Review Incentive Settings
 * Allows providers to configure discount rewards for reviews
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface ReviewIncentiveSettingsProps {
  providerId: string;
  listingId?: string;
}

export const ReviewIncentiveSettings: React.FC<ReviewIncentiveSettingsProps> = ({
  providerId,
  listingId,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: true,
    incentive_type: 'discount' as 'discount' | 'credit' | 'points',
    discount_percentage: '',
    discount_amount: '',
    min_rating: '4.0',
    require_text_review: false,
    max_uses_per_customer: '1',
    auto_generate_coupon: true,
    coupon_code_prefix: 'REVIEW',
    coupon_valid_days: '30',
    incentive_message: 'Thank you for your review! Here\'s a discount for your next booking.',
  });

  useEffect(() => {
    loadSettings();
  }, [providerId, listingId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('review_incentive_settings')
        .select('*')
        .eq('provider_id', providerId)
        .limit(1);

      if (listingId) {
        query = query.eq('listing_id', listingId);
      } else {
        query = query.is('listing_id', null);
      }

      const { data, error } = await query;

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

      if (data && data[0]) {
        const s = data[0];
        setSettings({
          enabled: s.enabled,
          incentive_type: s.incentive_type,
          discount_percentage: s.discount_percentage?.toString() || '',
          discount_amount: s.discount_amount?.toString() || '',
          min_rating: s.min_rating?.toString() || '4.0',
          require_text_review: s.require_text_review,
          max_uses_per_customer: s.max_uses_per_customer?.toString() || '1',
          auto_generate_coupon: s.auto_generate_coupon,
          coupon_code_prefix: s.coupon_code_prefix || 'REVIEW',
          coupon_valid_days: s.coupon_valid_days?.toString() || '30',
          incentive_message: s.incentive_message || '',
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.discount_percentage && !settings.discount_amount) {
      Alert.alert('Error', 'Please set either discount percentage or amount');
      return;
    }

    setSaving(true);
    try {
      const settingsData = {
        provider_id: providerId,
        listing_id: listingId || null,
        enabled: settings.enabled,
        incentive_type: settings.incentive_type,
        discount_percentage: settings.discount_percentage ? parseFloat(settings.discount_percentage) : null,
        discount_amount: settings.discount_amount ? parseFloat(settings.discount_amount) : null,
        min_rating: parseFloat(settings.min_rating),
        require_text_review: settings.require_text_review,
        max_uses_per_customer: parseInt(settings.max_uses_per_customer),
        auto_generate_coupon: settings.auto_generate_coupon,
        coupon_code_prefix: settings.coupon_code_prefix,
        coupon_valid_days: parseInt(settings.coupon_valid_days),
        incentive_message: settings.incentive_message,
      };

      const { error } = await supabase
        .from('review_incentive_settings')
        .upsert(settingsData, {
          onConflict: 'provider_id,listing_id',
        });

      if (error) throw error;

      Alert.alert('Success', 'Review incentive settings saved!');
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Review Incentive Settings</Text>
        <Text style={styles.subtitle}>
          Reward customers with discounts for leaving reviews
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Enable Review Incentives</Text>
            <Text style={styles.settingHint}>
              Offer discounts to customers who leave reviews
            </Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={(value) => setSettings({ ...settings, enabled: value })}
            trackColor={{ false: '#d1d5db', true: '#10b981' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {settings.enabled && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Discount Configuration</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Discount Percentage (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 10"
                value={settings.discount_percentage}
                onChangeText={(text) => setSettings({ ...settings, discount_percentage: text, discount_amount: '' })}
                keyboardType="numeric"
              />
              <Text style={styles.hint}>OR</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fixed Discount Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 5.00"
                value={settings.discount_amount}
                onChangeText={(text) => setSettings({ ...settings, discount_amount: text, discount_percentage: '' })}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Minimum Rating</Text>
              <TextInput
                style={styles.input}
                placeholder="4.0"
                value={settings.min_rating}
                onChangeText={(text) => setSettings({ ...settings, min_rating: text })}
                keyboardType="numeric"
              />
              <Text style={styles.hint}>Minimum star rating to receive incentive</Text>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Require Written Review</Text>
                <Text style={styles.settingHint}>
                  Customer must write a review, not just rate
                </Text>
              </View>
              <Switch
                value={settings.require_text_review}
                onValueChange={(value) => setSettings({ ...settings, require_text_review: value })}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Max Uses Per Customer</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                value={settings.max_uses_per_customer}
                onChangeText={(text) => setSettings({ ...settings, max_uses_per_customer: text })}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coupon Settings</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Auto-Generate Coupons</Text>
                <Text style={styles.settingHint}>
                  Automatically create discount codes for eligible reviews
                </Text>
              </View>
              <Switch
                value={settings.auto_generate_coupon}
                onValueChange={(value) => setSettings({ ...settings, auto_generate_coupon: value })}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor="#fff"
              />
            </View>

            {settings.auto_generate_coupon && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Coupon Code Prefix</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="REVIEW"
                    value={settings.coupon_code_prefix}
                    onChangeText={(text) => setSettings({ ...settings, coupon_code_prefix: text.toUpperCase() })}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Coupon Valid For (Days)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="30"
                    value={settings.coupon_valid_days}
                    onChangeText={(text) => setSettings({ ...settings, coupon_valid_days: text })}
                    keyboardType="numeric"
                  />
                </View>
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Thank you for your review! Here's a discount for your next booking."
              value={settings.incentive_message}
              onChangeText={(text) => setSettings({ ...settings, incentive_message: text })}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </>
      )}

      <Pressable
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Settings</Text>
        )}
      </Pressable>
    </ScrollView>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  settingHint: {
    fontSize: 12,
    color: '#6b7280',
  },
  inputGroup: {
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
    fontSize: 14,
    color: '#1f2937',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    margin: 20,
    marginTop: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
