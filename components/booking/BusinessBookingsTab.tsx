/**
 * Business Bookings Tab
 * Comprehensive provider dashboard with calendar, customer management, and analytics
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MyBookingsCalendar } from './MyBookingsCalendar';
import { QuickCustomerRegistration } from './QuickCustomerRegistration';
import { BusinessAnalytics } from './BusinessAnalytics';
import { CustomerManagement } from './CustomerManagement';

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
        return <MyBookingsCalendar userId={userId} viewType="provider" />;
      case 'register':
        return <QuickCustomerRegistration userId={userId} />;
      case 'analytics':
        return <BusinessAnalytics userId={userId} />;
      case 'customers':
        return <CustomerManagement userId={userId} />;
      default:
        return <MyBookingsCalendar userId={userId} viewType="provider" />;
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
            color={activeView === 'calendar' ? '#f25842' : '#6b7280'}
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
            color={activeView === 'register' ? '#f25842' : '#6b7280'}
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
            color={activeView === 'analytics' ? '#f25842' : '#6b7280'}
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
            color={activeView === 'customers' ? '#f25842' : '#6b7280'}
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
    backgroundColor: '#fff',
  },
  tabScrollView: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  businessTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeBusinessTab: {
    backgroundColor: '#fef2f2',
    borderColor: '#f25842',
  },
  businessTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeBusinessTabText: {
    color: '#f25842',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});


