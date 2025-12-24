/**
 * Unified Bookings Tab
 * Shows customer bookings (bookings the user has made)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MyBookingsCalendar } from './MyBookingsCalendar';

interface UnifiedBookingsTabProps {
  userId: string;
}

export const UnifiedBookingsTab: React.FC<UnifiedBookingsTabProps> = ({
  userId,
}) => {
  return (
    <View style={styles.container}>
      <MyBookingsCalendar userId={userId} viewType="customer" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
