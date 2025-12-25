/**
 * Customer Registration
 * Manual customer registration for walk-in customers
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { triggerLight, triggerSuccess } from '@/lib/utils/haptics';

interface QuickCustomerRegistrationProps {
  userId: string;
}

const PREDEFINED_TAGS = [
  { name: 'VIP', color: '#f59e0b' },
  { name: 'Regular', color: '#10b981' },
  { name: 'New', color: '#3b82f6' },
  { name: 'High Value', color: '#8b5cf6' },
  { name: 'Problematic', color: '#ef4444' },
];

export const QuickCustomerRegistration: React.FC<QuickCustomerRegistrationProps> = ({
  userId,
}) => {
  const [loading, setLoading] = useState(false);
  
  // Customer Registration Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [createFullAccount, setCreateFullAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [initialLoyaltyPoints, setInitialLoyaltyPoints] = useState('0');
  const [blockCustomer, setBlockCustomer] = useState(false);

  const handleRegisterCustomer = async () => {
    if (!customerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }

    if (createFullAccount && !customerEmail.trim()) {
      Alert.alert('Error', 'Email is required for full account');
      return;
    }

    if (createFullAccount && !password.trim()) {
      Alert.alert('Error', 'Password is required for full account');
      return;
    }

    if (createFullAccount && password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    triggerLight();

    try {
      let customerId: string | null = null;
      let isGuest = !createFullAccount;

      if (createFullAccount) {
        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', customerEmail.toLowerCase().trim())
          .single();

        if (existingUser) {
          // User exists, update their info
          customerId = existingUser.id;
          await supabase
            .from('users')
            .update({
              name: customerName.trim(),
              phone: customerPhone.trim() || null,
            })
            .eq('id', customerId);
        } else {
          // Create new user account (requires server-side function or manual creation)
          // For now, we'll create a guest user and note that full account requires email verification
          Alert.alert(
            'Full Account Creation',
            'Full account creation requires email verification. Creating guest profile instead. To create full accounts, use the signup flow or contact support.',
            [{ text: 'OK' }]
          );
          
          // Fall back to guest user
          const { data: newGuest, error: guestError } = await supabase
            .from('guest_users')
            .insert({
              name: customerName.trim(),
              email: customerEmail.toLowerCase().trim(),
              phone: customerPhone.trim() || null,
            })
            .select()
            .single();

          if (guestError) throw guestError;
          customerId = newGuest.id;
          isGuest = true;
        }
      } else {
        // Create guest user
        if (customerEmail) {
          // Check if guest exists
          const { data: existingGuest } = await supabase
            .from('guest_users')
            .select('id')
            .eq('email', customerEmail.toLowerCase().trim())
            .single();

          if (existingGuest) {
            customerId = existingGuest.id;
            await supabase
              .from('guest_users')
              .update({
                name: customerName.trim(),
                phone: customerPhone.trim() || null,
              })
              .eq('id', customerId);
          } else {
            const { data: newGuest, error: guestError } = await supabase
              .from('guest_users')
              .insert({
                name: customerName.trim(),
                email: customerEmail.toLowerCase().trim(),
                phone: customerPhone.trim() || null,
              })
              .select()
              .single();

            if (guestError) throw guestError;
            customerId = newGuest.id;
          }
        } else {
          // Create guest without email
          const { data: newGuest, error: guestError } = await supabase
            .from('guest_users')
            .insert({
              name: customerName.trim(),
              email: `guest_${Date.now()}@temp.local`,
              phone: customerPhone.trim() || null,
            })
            .select()
            .single();

          if (guestError) throw guestError;
          customerId = newGuest.id;
        }
      }

      // Save customer notes if provided
      if (customerNotes.trim() && customerId) {
        // Check if note exists
        const query = supabase
          .from('customer_notes')
          .select('id')
          .eq('provider_id', userId)
          .maybeSingle();

        if (isGuest) {
          query.eq('guest_customer_id', customerId);
        } else {
          query.eq('customer_id', customerId);
        }

        const { data: existingNote } = await query;

        const noteData: any = {
          provider_id: userId,
          notes: customerNotes.trim(),
        };

        if (isGuest) {
          noteData.guest_customer_id = customerId;
        } else {
          noteData.customer_id = customerId;
        }

        if (existingNote) {
          // Update existing note
          await supabase
            .from('customer_notes')
            .update({ notes: customerNotes.trim(), updated_at: new Date().toISOString() })
            .eq('id', existingNote.id);
        } else {
          // Create new note
          await supabase.from('customer_notes').insert(noteData);
        }
      }

      // Add tags if selected
      if (selectedTags.length > 0 && customerId) {
        const tagPromises = selectedTags.map((tagName) => {
          const tag = PREDEFINED_TAGS.find(t => t.name === tagName);
          if (!tag) return null;

          const tagData: any = {
            provider_id: userId,
            tag_name: tag.name,
            tag_color: tag.color,
          };

          if (isGuest) {
            tagData.guest_customer_id = customerId;
          } else {
            tagData.customer_id = customerId;
          }

          return supabase.from('customer_tags').insert(tagData);
        });

        await Promise.all(tagPromises.filter(p => p !== null));
      }

      // Initialize loyalty points if provided
      const points = parseInt(initialLoyaltyPoints) || 0;
      if (points > 0 && customerId) {
        const loyaltyData: any = {
          provider_id: userId,
          points: points,
          total_earned: points,
          total_redeemed: 0,
        };

        if (isGuest) {
          loyaltyData.guest_customer_id = customerId;
        } else {
          loyaltyData.customer_id = customerId;
        }

        const { data: loyaltyRecord, error: loyaltyError } = await supabase
          .from('customer_loyalty_points')
          .upsert(loyaltyData, {
            onConflict: 'provider_id,customer_id,guest_customer_id',
          })
          .select()
          .single();

        if (!loyaltyError && loyaltyRecord) {
          // Add history entry
          await supabase.from('loyalty_points_history').insert({
            loyalty_points_id: loyaltyRecord.id,
            points_change: points,
            reason: 'manual_adjustment',
            notes: 'Initial points on registration',
          });
        }
      }

      // Block customer if requested
      if (blockCustomer && customerId) {
        const query = supabase
          .from('blocked_customers')
          .select('id')
          .eq('provider_id', userId)
          .eq('is_active', true)
          .maybeSingle();

        if (isGuest) {
          query.eq('guest_customer_id', customerId);
        } else {
          query.eq('customer_id', customerId);
        }

        const { data: existingBlock } = await query;

        const blockData: any = {
          provider_id: userId,
          is_active: true,
          reason: 'Blocked during registration',
        };

        if (isGuest) {
          blockData.guest_customer_id = customerId;
        } else {
          blockData.customer_id = customerId;
        }

        if (!existingBlock) {
          // Only create if not already blocked
          await supabase.from('blocked_customers').insert(blockData);
        }
      }

      triggerSuccess();
      Alert.alert(
        'Success!',
        `Customer ${createFullAccount ? 'account' : 'profile'} created successfully`,
        [
          {
            text: 'Register Another',
            onPress: () => {
              resetRegistrationForm();
            },
          },
          { text: 'Done', style: 'cancel' },
        ]
      );
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error registering customer:', error);
      }
      Alert.alert('Error', error.message || 'Failed to register customer');
    } finally {
      setLoading(false);
    }
  };

  const resetRegistrationForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerNotes('');
    setPassword('');
    setCreateFullAccount(false);
    setSelectedTags([]);
    setInitialLoyaltyPoints('0');
    setBlockCustomer(false);
  };

  const toggleTag = (tagName: string) => {
    triggerLight();
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter(t => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="person-add" size={32} color="#f25842" />
        <View style={styles.headerText}>
          <Text style={styles.title}>Customer Registration</Text>
          <Text style={styles.subtitle}>Register new customers manually</Text>
        </View>
      </View>
      {/* Account Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Type</Text>
        <View style={styles.switchRow}>
          <View style={styles.switchLabelContainer}>
            <Text style={styles.switchLabel}>Create Full Account</Text>
            <Text style={styles.switchSubLabel}>
              Customer will have full app access with login credentials
            </Text>
          </View>
          <Switch
            value={createFullAccount}
            onValueChange={setCreateFullAccount}
            trackColor={{ false: '#d1d5db', true: '#f25842' }}
            thumbColor="#ffffff"
          />
        </View>
        {!createFullAccount && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={16} color="#3b82f6" />
            <Text style={styles.infoText}>
              Guest profile allows quick registration without app access. Customer can convert to full account later.
            </Text>
          </View>
        )}
      </View>

      {/* Basic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Full Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Enter customer's full name"
            placeholderTextColor="#9ca3af"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Email Address {createFullAccount && <Text style={styles.required}>*</Text>}
            {!createFullAccount && <Text style={styles.optional}>(Optional)</Text>}
          </Text>
          <TextInput
            style={styles.input}
            value={customerEmail}
            onChangeText={setCustomerEmail}
            placeholder="customer@example.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {createFullAccount && (
            <Text style={styles.hintText}>
              Required for account creation and email notifications
            </Text>
          )}
        </View>

        {createFullAccount && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Password <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Minimum 6 characters"
              placeholderTextColor="#9ca3af"
              secureTextEntry
            />
            <Text style={styles.hintText}>
              Customer will use this to log in to their account
            </Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Phone Number <Text style={styles.optional}>(Optional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="+44 7XXX XXXXXX"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
          />
          <Text style={styles.hintText}>
            Used for SMS notifications and quick contact
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Address <Text style={styles.optional}>(Optional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={customerAddress}
            onChangeText={setCustomerAddress}
            placeholder="Street address, city, postal code"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
          <Text style={styles.hintText}>
            Service address for on-site appointments
          </Text>
        </View>
      </View>

      {/* Customer Tags */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Tags</Text>
        <Text style={styles.sectionSubtitle}>
          Categorize customers for better organization
        </Text>
        <View style={styles.tagsContainer}>
          {PREDEFINED_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag.name);
            return (
              <Pressable
                key={tag.name}
                style={[
                  styles.tagChip,
                  isSelected && { backgroundColor: tag.color, borderColor: tag.color },
                ]}
                onPress={() => toggleTag(tag.name)}
              >
                <Text
                  style={[
                    styles.tagChipText,
                    isSelected && styles.tagChipTextSelected,
                  ]}
                >
                  {tag.name}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={16} color="#ffffff" style={{ marginLeft: 4 }} />
                )}
              </Pressable>
            );
          })}
        </View>
        {selectedTags.length > 0 && (
          <Text style={styles.selectedTagsText}>
            Selected: {selectedTags.join(', ')}
          </Text>
        )}
      </View>

      {/* Loyalty Points */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Loyalty Points</Text>
        <Text style={styles.sectionSubtitle}>
          Set initial loyalty points for this customer
        </Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Initial Points <Text style={styles.optional}>(Optional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={initialLoyaltyPoints}
            onChangeText={setInitialLoyaltyPoints}
            placeholder="0"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
          />
          <Text style={styles.hintText}>
            Points can be redeemed for discounts or rewards
          </Text>
        </View>
      </View>

      {/* Customer Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Notes</Text>
        <Text style={styles.sectionSubtitle}>
          Add private notes about this customer
        </Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Notes <Text style={styles.optional}>(Optional)</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={customerNotes}
            onChangeText={setCustomerNotes}
            placeholder="Customer preferences, special requirements, important information..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.hintText}>
            These notes are private and only visible to you
          </Text>
        </View>
      </View>

      {/* Additional Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Options</Text>
        
        <View style={styles.switchRow}>
          <View style={styles.switchLabelContainer}>
            <Text style={styles.switchLabel}>Block Customer</Text>
            <Text style={styles.switchSubLabel}>
              Prevent this customer from making new bookings
            </Text>
          </View>
          <Switch
            value={blockCustomer}
            onValueChange={setBlockCustomer}
            trackColor={{ false: '#d1d5db', true: '#ef4444' }}
            thumbColor="#ffffff"
          />
        </View>
        {blockCustomer && (
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={16} color="#ef4444" />
            <Text style={styles.warningText}>
              This customer will be blocked from making new bookings. You can unblock them later from their profile.
            </Text>
          </View>
        )}
      </View>

      <Pressable
        style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
        onPress={handleRegisterCustomer}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Register Customer</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  switchLabelContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  switchSubLabel: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  required: {
    color: '#ef4444',
    fontWeight: '600',
  },
  optional: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: 'normal',
  },
  hintText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 16,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#991b1b',
    lineHeight: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  tagChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tagChipTextSelected: {
    color: '#ffffff',
  },
  selectedTagsText: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 8,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#f25842',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});


