/**
 * Unified Bookings Tab
 * Shows customer bookings (bookings the user has made)
 */

import React from 'react';
import { UnifiedCalendar } from '../calendar';

interface UnifiedBookingsTabProps {
  userId: string;
}

export const UnifiedBookingsTab: React.FC<UnifiedBookingsTabProps> = ({
  userId,
}) => {
  return (
    <UnifiedCalendar
      mode="management"
      userId={userId}
      viewType="customer"
      showStats={true}
      showExternalSync={true}
      allowBookingCreation={true}
      showEventDots={true}
    />
  );
};
