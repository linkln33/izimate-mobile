/**
 * Business Bookings Tab
 * Comprehensive provider dashboard with calendar, customer management, and analytics
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UnifiedCalendar } from '../calendar';
import { QuickCustomerRegistration } from './QuickCustomerRegistration';
import { BusinessAnalytics } from './BusinessAnalytics';
import { CustomerManagement } from './CustomerManagement';
import { pastelDesignSystem } from '@/lib/pastel-design-system';
const { colors: pastelColors, surfaces, elevation, spacing, borderRadius } = pastelDesignSystem;

interface BusinessBookingsTabProps {
  userId: string;
}

type BusinessView = 'calendar' | 'register' | 'analytics' | 'customers';

export const BusinessBookingsTab: React.FC<BusinessBookingsTabProps> = ({
  userId,
}) => {
  const [activeView, setActiveView] = useState<BusinessView>('calendar');

  const renderContent = () => {
    switch (activeView) {
      case 'calendar':
        return (
          <UnifiedCalendar
            mode="management"
            userId={userId}
            viewType="provider"
            showStats={true}
            showExternalSync={true}
            allowBookingCreation={true}
            showEventDots={true}
          />
        );
      case 'register':
        return <QuickCustomerRegistration userId={userId} />;
      case 'analytics':
        return <BusinessAnalytics userId={userId} />;
      case 'customers':
        return <CustomerManagement userId={userId} />;
      default:
        return (
          <UnifiedCalendar
            mode="management"
            userId={userId}
            viewType="provider"
            showStats={true}
            showExternalSync={true}
            allowBookingCreation={true}
            showEventDots={true}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Business Tab Switcher */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollView}
        contentContainerStyle={styles.tabScrollContent}
      >
        <Pressable
          style={[styles.businessTab, activeView === 'calendar' && styles.activeBusinessTab]}
          onPress={() => setActiveView('calendar')}
        >
          <Ionicons
            name={activeView === 'calendar' ? 'calendar' : 'calendar-outline'}
            size={20}
            color={activeView === 'calendar' ? pastelColors.primary[500] : surfaces.onSurfaceVariant}
          />
          <Text
            style={[
              styles.businessTabText,
              activeView === 'calendar' && styles.activeBusinessTabText,
            ]}
          >
            Calendar
          </Text>
        </Pressable>

        <Pressable
          style={[styles.businessTab, activeView === 'register' && styles.activeBusinessTab]}
          onPress={() => setActiveView('register')}
        >
          <Ionicons
            name={activeView === 'register' ? 'person-add' : 'person-add-outline'}
            size={20}
            color={activeView === 'register' ? pastelColors.primary[500] : surfaces.onSurfaceVariant}
          />
          <Text
            style={[
              styles.businessTabText,
              activeView === 'register' && styles.activeBusinessTabText,
            ]}
          >
            Quick Register
          </Text>
        </Pressable>

        <Pressable
          style={[styles.businessTab, activeView === 'analytics' && styles.activeBusinessTab]}
          onPress={() => setActiveView('analytics')}
        >
          <Ionicons
            name={activeView === 'analytics' ? 'analytics' : 'analytics-outline'}
            size={20}
            color={activeView === 'analytics' ? pastelColors.primary[500] : surfaces.onSurfaceVariant}
          />
          <Text
            style={[
              styles.businessTabText,
              activeView === 'analytics' && styles.activeBusinessTabText,
            ]}
          >
            Analytics
          </Text>
        </Pressable>

        <Pressable
          style={[styles.businessTab, activeView === 'customers' && styles.activeBusinessTab]}
          onPress={() => setActiveView('customers')}
        >
          <Ionicons
            name={activeView === 'customers' ? 'people' : 'people-outline'}
            size={20}
            color={activeView === 'customers' ? pastelColors.primary[500] : surfaces.onSurfaceVariant}
          />
          <Text
            style={[
              styles.businessTabText,
              activeView === 'customers' && styles.activeBusinessTabText,
            ]}
          >
            Customers
          </Text>
        </Pressable>
      </ScrollView>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: surfaces.background,
  },
  tabScrollView: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: surfaces.outline,
  },
  tabScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  businessTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    backgroundColor: surfaces.surface,
    gap: spacing.xs,
    ...elevation.level1,
  },
  activeBusinessTab: {
    backgroundColor: pastelColors.primary[100],
  },
  businessTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: surfaces.onSurfaceVariant,
  },
  activeBusinessTabText: {
    color: pastelColors.primary[600],
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});


