import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { triggerLight, triggerSuccess } from '@/lib/utils/haptics';
import { getOrCreateDirectMatch } from '@/lib/utils/matching';

interface CustomerProfileProps {
  customerId?: string;
  guestCustomerId?: string;
  providerId: string;
  onBack: () => void;
}

interface CustomerData {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  isGuest: boolean;
}

interface CustomerStats {
  totalBookings: number;
  completedBookings: number;
  totalSpent: number;
  averageBookingValue: number;
  lastBookingDate?: string;
  firstBookingDate?: string;
}

interface CustomerNote {
  id: string;
  notes: string;
  updated_at: string;
}

interface CustomerTag {
  id: string;
  tag_name: string;
  tag_color: string;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
}

const PREDEFINED_TAGS = [
  { name: 'VIP', color: '#f59e0b' },
  { name: 'Regular', color: '#10b981' },
  { name: 'New', color: '#3b82f6' },
  { name: 'High Value', color: '#8b5cf6' },
  { name: 'Problematic', color: '#ef4444' },
];

export function CustomerProfile({
  customerId,
  guestCustomerId,
  providerId,
  onBack,
}: CustomerProfileProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [stats, setStats] = useState<CustomerStats>({
    totalBookings: 0,
    completedBookings: 0,
    totalSpent: 0,
    averageBookingValue: 0,
  });
  const [notes, setNotes] = useState('');
  const [existingNote, setExistingNote] = useState<CustomerNote | null>(null);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [showAddTag, setShowAddTag] = useState(false);

  useEffect(() => {
    loadCustomerData();
  }, [customerId, guestCustomerId, providerId]);

  const loadCustomerData = async () => {
    try {
      setLoading(true);

      // Load customer info
      if (customerId) {
        const { data: customerData, error: customerError } = await supabase
          .from('users')
          .select('id, name, email, phone, avatar_url')
          .eq('id', customerId)
          .single();

        if (customerData) {
          setCustomer({
            id: customerData.id,
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
            avatar_url: customerData.avatar_url,
            isGuest: false,
          });
        }
      } else if (guestCustomerId) {
        const { data: guestData, error: guestError } = await supabase
          .from('guest_users')
          .select('id, name, email, phone')
          .eq('id', guestCustomerId)
          .single();

        if (guestData) {
          setCustomer({
            id: guestData.id,
            name: guestData.name,
            email: guestData.email,
            phone: guestData.phone,
            isGuest: true,
          });
        }
      }

      // Load stats
      await loadStats();

      // Load notes
      await loadNotes();

      // Load tags
      await loadTags();

      // Load blocked status
      await loadBlockedStatus();

      // Load loyalty points
      await loadLoyaltyPoints();

      // Load communication history
      if (customerId) {
        await loadCommunicationHistory();
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading customer data:', error);
      }
      Alert.alert('Error', 'Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const query = supabase
        .from('bookings')
        .select('service_price, status, created_at')
        .eq('provider_id', providerId);

      if (customerId) {
        query.eq('customer_id', customerId);
      } else if (guestCustomerId) {
        query.eq('guest_customer_id', guestCustomerId);
      }

      const { data: bookings } = await query;

      if (bookings && bookings.length > 0) {
        const totalBookings = bookings.length;
        const completedBookings = bookings.filter(b => b.status === 'completed').length;
        const totalSpent = bookings
          .filter(b => b.status === 'completed')
          .reduce((sum, b) => sum + (Number(b.service_price) || 0), 0);
        const averageBookingValue = completedBookings > 0 ? totalSpent / completedBookings : 0;

        const dates = bookings
          .map(b => new Date(b.created_at).getTime())
          .filter(d => !isNaN(d))
          .sort((a, b) => a - b);

        setStats({
          totalBookings,
          completedBookings,
          totalSpent,
          averageBookingValue,
          lastBookingDate: dates.length > 0 ? new Date(dates[dates.length - 1]).toISOString() : undefined,
          firstBookingDate: dates.length > 0 ? new Date(dates[0]).toISOString() : undefined,
        });
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading stats:', error);
      }
    }
  };

  const loadNotes = async () => {
    try {
      const query = supabase
        .from('customer_notes')
        .select('*')
        .eq('provider_id', providerId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (customerId) {
        query.eq('customer_id', customerId);
      } else if (guestCustomerId) {
        query.eq('guest_customer_id', guestCustomerId);
      }

      const { data } = await query;

      if (data && data.length > 0) {
        setExistingNote(data[0]);
        setNotes(data[0].notes);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading notes:', error);
      }
    }
  };

  const loadTags = async () => {
    try {
      const query = supabase
        .from('customer_tags')
        .select('*')
        .eq('provider_id', providerId);

      if (customerId) {
        query.eq('customer_id', customerId);
      } else if (guestCustomerId) {
        query.eq('guest_customer_id', guestCustomerId);
      }

      const { data } = await query;

      if (data) {
        setTags(data);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading tags:', error);
      }
    }
  };

  const loadBlockedStatus = async () => {
    try {
      const query = supabase
        .from('blocked_customers')
        .select('is_active')
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .maybeSingle();

      if (customerId) {
        query.eq('customer_id', customerId);
      } else if (guestCustomerId) {
        query.eq('guest_customer_id', guestCustomerId);
      }

      const { data } = await query;
      setIsBlocked(data?.is_active || false);
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading blocked status:', error);
      }
    }
  };

  const loadLoyaltyPoints = async () => {
    try {
      const query = supabase
        .from('customer_loyalty_points')
        .select('points')
        .eq('provider_id', providerId)
        .maybeSingle();

      if (customerId) {
        query.eq('customer_id', customerId);
      } else if (guestCustomerId) {
        query.eq('guest_customer_id', guestCustomerId);
      }

      const { data } = await query;
      setLoyaltyPoints(data?.points || 0);
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading loyalty points:', error);
      }
    }
  };

  const loadCommunicationHistory = async () => {
    if (!customerId) return;

    try {
      // Find matches between provider and customer
      const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .or(`and(customer_id.eq.${customerId},provider_id.eq.${providerId}),and(customer_id.eq.${providerId},provider_id.eq.${customerId})`);

      if (matches && matches.length > 0) {
        const matchIds = matches.map(m => m.id);
        const { data: messages } = await supabase
          .from('messages')
          .select('id, content, created_at, sender_id')
          .in('match_id', matchIds)
          .order('created_at', { ascending: false })
          .limit(10);

        if (messages) {
          setRecentMessages(messages);
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading communication history:', error);
      }
    }
  };

  const handleSaveNotes = async () => {
    if (!notes.trim()) {
      Alert.alert('Error', 'Notes cannot be empty');
      return;
    }

    try {
      setSaving(true);
      triggerLight();

      if (existingNote) {
        // Update existing note
        const { error } = await supabase
          .from('customer_notes')
          .update({ notes, updated_at: new Date().toISOString() })
          .eq('id', existingNote.id);

        if (error) throw error;
      } else {
        // Create new note
        const noteData: any = {
          provider_id: providerId,
          notes,
        };

        if (customerId) {
          noteData.customer_id = customerId;
        } else if (guestCustomerId) {
          noteData.guest_customer_id = guestCustomerId;
        }

        const { error } = await supabase
          .from('customer_notes')
          .insert(noteData);

        if (error) throw error;
      }

      triggerSuccess();
      Alert.alert('Success', 'Notes saved');
      await loadNotes();
    } catch (error) {
      if (__DEV__) {
        console.error('Error saving notes:', error);
      }
      Alert.alert('Error', 'Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = async (tagName: string, tagColor: string) => {
    try {
      triggerLight();

      const tagData: any = {
        provider_id: providerId,
        tag_name: tagName,
        tag_color: tagColor,
      };

      if (customerId) {
        tagData.customer_id = customerId;
      } else if (guestCustomerId) {
        tagData.guest_customer_id = guestCustomerId;
      }

      const { error } = await supabase
        .from('customer_tags')
        .insert(tagData);

      if (error) throw error;

      triggerSuccess();
      setShowAddTag(false);
      await loadTags();
    } catch (error) {
      if (__DEV__) {
        console.error('Error adding tag:', error);
      }
      Alert.alert('Error', 'Failed to add tag');
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      triggerLight();

      const { error } = await supabase
        .from('customer_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      await loadTags();
    } catch (error) {
      if (__DEV__) {
        console.error('Error removing tag:', error);
      }
      Alert.alert('Error', 'Failed to remove tag');
    }
  };

  const handleBlockUnblock = async () => {
    try {
      triggerLight();

      if (isBlocked) {
        // Unblock
        const query = supabase
          .from('blocked_customers')
          .update({ is_active: false })
          .eq('provider_id', providerId)
          .eq('is_active', true);

        if (customerId) {
          query.eq('customer_id', customerId);
        } else if (guestCustomerId) {
          query.eq('guest_customer_id', guestCustomerId);
        }

        const { error } = await query;
        if (error) throw error;
        setIsBlocked(false);
        triggerSuccess();
        Alert.alert('Success', 'Customer unblocked');
      } else {
        // Block
        Alert.alert(
          'Block Customer',
          'Are you sure you want to block this customer? They will not be able to make new bookings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Block',
              style: 'destructive',
              onPress: async () => {
                const blockData: any = {
                  provider_id: providerId,
                  is_active: true,
                };

                if (customerId) {
                  blockData.customer_id = customerId;
                } else if (guestCustomerId) {
                  blockData.guest_customer_id = guestCustomerId;
                }

                const { error } = await supabase
                  .from('blocked_customers')
                  .insert(blockData);

                if (error) throw error;

                setIsBlocked(true);
                triggerSuccess();
                Alert.alert('Success', 'Customer blocked');
              },
            },
          ]
        );
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error blocking/unblocking:', error);
      }
      Alert.alert('Error', 'Failed to update block status');
    }
  };

  const handleCall = () => {
    if (!customer?.phone) {
      Alert.alert('Error', 'No phone number available');
      return;
    }
    triggerLight();
    Linking.openURL(`tel:${customer.phone}`);
  };

  const handleMessage = async () => {
    if (!customerId) {
      Alert.alert('Error', 'Cannot message guest customers');
      return;
    }

    try {
      triggerLight();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const result = await getOrCreateDirectMatch(user.id, customerId);
      if (result.success && result.match) {
        router.push(`/chat/${result.match.id}`);
      } else {
        Alert.alert('Error', 'Failed to start conversation');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error creating match:', error);
      }
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const handleEmail = () => {
    if (!customer?.email) {
      Alert.alert('Error', 'No email address available');
      return;
    }
    triggerLight();
    Linking.openURL(`mailto:${customer.email}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f25842" />
        <Text style={styles.loadingText}>Loading customer profile...</Text>
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Customer not found</Text>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </Pressable>
        <Text style={styles.headerTitle}>Customer Profile</Text>
        <View style={styles.headerRight}>
          {isBlocked && (
            <View style={styles.blockedBadge}>
              <Ionicons name="ban" size={16} color="#ef4444" />
              <Text style={styles.blockedText}>Blocked</Text>
            </View>
          )}
        </View>
      </View>

      {/* Customer Info */}
      <View style={styles.customerCard}>
        <View style={styles.avatarContainer}>
          {customer.avatar_url ? (
            <Image source={{ uri: customer.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color="#6b7280" />
            </View>
          )}
        </View>
        <Text style={styles.customerName}>{customer.name}</Text>
        {customer.isGuest && (
          <View style={styles.guestBadge}>
            <Text style={styles.guestBadgeText}>Guest</Text>
          </View>
        )}

        {/* Quick Contact */}
        <View style={styles.quickContact}>
          {customer.phone && (
            <Pressable style={styles.contactButton} onPress={handleCall}>
              <Ionicons name="call" size={20} color="#3b82f6" />
            </Pressable>
          )}
          {customerId && (
            <Pressable style={styles.contactButton} onPress={handleMessage}>
              <Ionicons name="chatbubble" size={20} color="#10b981" />
            </Pressable>
          )}
          {customer.email && (
            <Pressable style={styles.contactButton} onPress={handleEmail}>
              <Ionicons name="mail" size={20} color="#8b5cf6" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Basic Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalBookings}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.completedBookings}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>£{stats.totalSpent.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>£{stats.averageBookingValue.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Avg. Value</Text>
          </View>
        </View>
        {stats.lastBookingDate && (
          <Text style={styles.lastBookingText}>
            Last booking: {new Date(stats.lastBookingDate).toLocaleDateString()}
          </Text>
        )}
      </View>

      {/* Tags */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <Pressable onPress={() => setShowAddTag(!showAddTag)}>
            <Ionicons name="add-circle" size={24} color="#3b82f6" />
          </Pressable>
        </View>
        {showAddTag && (
          <View style={styles.addTagContainer}>
            {PREDEFINED_TAGS.map((tag) => (
              <Pressable
                key={tag.name}
                style={[styles.tagChip, { backgroundColor: tag.color }]}
                onPress={() => handleAddTag(tag.name, tag.color)}
              >
                <Text style={styles.tagChipText}>{tag.name}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={styles.tagsContainer}>
          {tags.map((tag) => (
            <View key={tag.id} style={[styles.tag, { backgroundColor: tag.tag_color }]}>
              <Text style={styles.tagText}>{tag.tag_name}</Text>
              <Pressable onPress={() => handleRemoveTag(tag.id)}>
                <Ionicons name="close-circle" size={18} color="#ffffff" />
              </Pressable>
            </View>
          ))}
          {tags.length === 0 && (
            <Text style={styles.emptyText}>No tags added</Text>
          )}
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add notes about this customer..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveNotes}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Notes</Text>
          )}
        </Pressable>
      </View>

      {/* Communication History */}
      {customerId && recentMessages.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Messages</Text>
          {recentMessages.slice(0, 5).map((message) => (
            <View key={message.id} style={styles.messageItem}>
              <Text style={styles.messageText}>{message.content}</Text>
              <Text style={styles.messageDate}>
                {new Date(message.created_at).toLocaleDateString()}
              </Text>
            </View>
          ))}
          <Pressable style={styles.viewAllButton} onPress={handleMessage}>
            <Text style={styles.viewAllText}>View All Messages</Text>
          </Pressable>
        </View>
      )}

      {/* Loyalty Points */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Loyalty Points</Text>
        <View style={styles.loyaltyCard}>
          <Text style={styles.loyaltyPoints}>{loyaltyPoints}</Text>
          <Text style={styles.loyaltyLabel}>Points Available</Text>
        </View>
      </View>

      {/* Block/Unblock */}
      <View style={styles.section}>
        <Pressable
          style={[styles.blockButton, isBlocked && styles.unblockButton]}
          onPress={handleBlockUnblock}
        >
          <Ionicons
            name={isBlocked ? 'checkmark-circle' : 'ban'}
            size={20}
            color="#ffffff"
          />
          <Text style={styles.blockButtonText}>
            {isBlocked ? 'Unblock Customer' : 'Block Customer'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerRight: {
    width: 100,
    alignItems: 'flex-end',
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    color: '#3b82f6',
    fontSize: 16,
  },
  blockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  blockedText: {
    color: '#ef4444',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  customerCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  guestBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  guestBadgeText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
  },
  quickContact: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  contactButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  lastBookingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addTagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagChipText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
    fontStyle: 'italic',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  messageItem: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
  },
  messageDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  viewAllButton: {
    marginTop: 8,
    padding: 12,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  loyaltyCard: {
    backgroundColor: '#f0fdf4',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  loyaltyPoints: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  loyaltyLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  unblockButton: {
    backgroundColor: '#10b981',
  },
  blockButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
