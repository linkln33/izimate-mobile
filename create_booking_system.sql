-- =====================================================
-- IZIMATE BOOKING SYSTEM - COMPREHENSIVE SCHEMA
-- =====================================================
-- This script creates the complete booking system infrastructure
-- for service providers with calendar integration and slot management

-- =====================================================
-- 1. SERVICE SETTINGS TABLE
-- =====================================================
-- Stores configuration for each bookable service listing
CREATE TABLE IF NOT EXISTS service_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  
  -- Service Configuration
  booking_enabled BOOLEAN DEFAULT false,
  service_type VARCHAR(50) DEFAULT 'appointment', -- 'appointment', 'consultation', 'service', 'class'
  
  -- Duration and Pricing
  default_duration_minutes INTEGER DEFAULT 60,
  buffer_minutes INTEGER DEFAULT 15, -- Time between appointments
  
  -- Multiple Service Options (JSON array)
  service_options JSONB DEFAULT '[]'::jsonb, -- [{"name": "Haircut", "duration": 45, "price": 35}, ...]
  
  -- Booking Policies
  advance_booking_days INTEGER DEFAULT 30, -- How far ahead customers can book
  same_day_booking BOOLEAN DEFAULT true,
  auto_confirm BOOLEAN DEFAULT false, -- Auto-confirm or require manual approval
  cancellation_hours INTEGER DEFAULT 24, -- Hours notice required for free cancellation
  
  -- Working Hours (JSON object)
  working_hours JSONB DEFAULT '{
    "monday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "tuesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "wednesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "thursday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "friday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "saturday": {"enabled": false, "start": "09:00", "end": "15:00"},
    "sunday": {"enabled": false, "start": "10:00", "end": "16:00"}
  }'::jsonb,
  
  -- Break Times (JSON array)
  break_times JSONB DEFAULT '[{"start": "12:00", "end": "13:00", "title": "Lunch Break"}]'::jsonb,
  
  -- Calendar Integration
  calendar_connected BOOLEAN DEFAULT false,
  calendar_provider VARCHAR(20), -- 'google', 'outlook', 'apple', 'manual'
  calendar_id VARCHAR(255), -- External calendar ID
  last_sync_at TIMESTAMP,
  sync_enabled BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 2. EXTERNAL CALENDAR EVENTS (BUSY TIMES)
-- =====================================================
-- Stores busy times imported from external calendars
CREATE TABLE IF NOT EXISTS provider_busy_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  
  -- Event Details
  external_event_id VARCHAR(255), -- ID from external calendar
  title VARCHAR(255),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  
  -- Source Information
  source VARCHAR(20) NOT NULL, -- 'google', 'outlook', 'manual', 'izimate'
  calendar_id VARCHAR(255), -- Which calendar this came from
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent duplicate imports
  UNIQUE(external_event_id, source, provider_id)
);

-- =====================================================
-- 3. AVAILABLE TIME SLOTS
-- =====================================================
-- Generated/calculated available slots for booking
CREATE TABLE IF NOT EXISTS service_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Slot Timing
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  
  -- Slot Details
  service_name VARCHAR(100), -- Which service this slot is for
  price_amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'GBP',
  
  -- Availability Status
  status VARCHAR(20) DEFAULT 'available', -- 'available', 'booked', 'blocked', 'held'
  held_until TIMESTAMP, -- For temporary holds during booking process
  held_by_customer UUID REFERENCES users(id),
  
  -- Generation Info
  generated_at TIMESTAMP DEFAULT NOW(),
  is_recurring BOOLEAN DEFAULT false, -- For recurring availability
  
  -- Indexes for performance
  INDEX idx_service_slots_listing_date (listing_id, slot_date),
  INDEX idx_service_slots_status (status),
  INDEX idx_service_slots_provider_date (provider_id, slot_date)
);

-- =====================================================
-- 4. BOOKINGS TABLE
-- =====================================================
-- Customer reservations and appointments
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES service_slots(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Booking Details
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  
  -- Service Information
  service_name VARCHAR(100) NOT NULL,
  service_price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  
  -- Booking Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
  
  -- Communication
  customer_notes TEXT,
  provider_notes TEXT,
  cancellation_reason TEXT,
  
  -- External Calendar Integration
  google_event_id VARCHAR(255), -- For Google Calendar sync
  outlook_event_id VARCHAR(255), -- For Outlook sync
  
  -- Important Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Prevent double booking
  UNIQUE(provider_id, booking_date, start_time)
);

-- =====================================================
-- 5. CALENDAR CONNECTIONS TABLE
-- =====================================================
-- Stores OAuth tokens and calendar connection info
CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Provider Information
  provider VARCHAR(20) NOT NULL, -- 'google', 'outlook', 'apple'
  calendar_id VARCHAR(255) NOT NULL, -- External calendar ID
  calendar_name VARCHAR(255), -- Display name
  
  -- OAuth Tokens (encrypted in production)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  
  -- Sync Configuration
  is_primary BOOLEAN DEFAULT false, -- Primary calendar for availability
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  sync_frequency_minutes INTEGER DEFAULT 15,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  connection_status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'error'
  last_error TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- One connection per provider per user
  UNIQUE(user_id, provider, calendar_id)
);

-- =====================================================
-- 6. BOOKING NOTIFICATIONS TABLE
-- =====================================================
-- Track notifications sent for bookings
CREATE TABLE IF NOT EXISTS booking_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Notification Details
  notification_type VARCHAR(50) NOT NULL, -- 'booking_request', 'booking_confirmed', 'reminder', 'cancellation'
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_type VARCHAR(20) NOT NULL, -- 'customer', 'provider'
  
  -- Delivery Information
  delivery_method VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push', 'in_app'
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  
  -- Content
  subject VARCHAR(255),
  message TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================

-- Service Settings Indexes
CREATE INDEX IF NOT EXISTS idx_service_settings_listing ON service_settings(listing_id);
CREATE INDEX IF NOT EXISTS idx_service_settings_booking_enabled ON service_settings(booking_enabled) WHERE booking_enabled = true;

-- Busy Times Indexes
CREATE INDEX IF NOT EXISTS idx_busy_times_provider_date ON provider_busy_times(provider_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_busy_times_listing_date ON provider_busy_times(listing_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_busy_times_source ON provider_busy_times(source);

-- Bookings Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_provider_date ON bookings(provider_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_listing ON bookings(listing_id);

-- Calendar Connections Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user ON calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_active ON calendar_connections(user_id) WHERE is_active = true;

-- =====================================================
-- 8. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE service_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_busy_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_notifications ENABLE ROW LEVEL SECURITY;

-- Service Settings Policies
CREATE POLICY "Users can view service settings for public listings" ON service_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE listings.id = service_settings.listing_id 
      AND listings.status = 'active'
    )
  );

CREATE POLICY "Users can manage their own service settings" ON service_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE listings.id = service_settings.listing_id 
      AND listings.user_id = auth.uid()
    )
  );

-- Busy Times Policies
CREATE POLICY "Providers can manage their own busy times" ON provider_busy_times
  FOR ALL USING (provider_id = auth.uid());

-- Service Slots Policies
CREATE POLICY "Anyone can view available slots" ON service_slots
  FOR SELECT USING (status = 'available');

CREATE POLICY "Providers can manage their own slots" ON service_slots
  FOR ALL USING (provider_id = auth.uid());

-- Bookings Policies
CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (customer_id = auth.uid() OR provider_id = auth.uid());

CREATE POLICY "Customers can create bookings" ON bookings
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Providers can update their bookings" ON bookings
  FOR UPDATE USING (provider_id = auth.uid());

-- Calendar Connections Policies
CREATE POLICY "Users can manage their own calendar connections" ON calendar_connections
  FOR ALL USING (user_id = auth.uid());

-- Booking Notifications Policies
CREATE POLICY "Users can view their own notifications" ON booking_notifications
  FOR SELECT USING (recipient_id = auth.uid());

-- =====================================================
-- 9. FUNCTIONS FOR SLOT MANAGEMENT
-- =====================================================

-- Function to calculate available slots for a specific date
CREATE OR REPLACE FUNCTION calculate_available_slots(
  p_listing_id UUID,
  p_date DATE,
  p_service_duration INTEGER DEFAULT 60
) RETURNS TABLE (
  slot_start TIME,
  slot_end TIME,
  is_available BOOLEAN
) AS $$
DECLARE
  settings RECORD;
  working_hours JSONB;
  day_name TEXT;
  day_start TIME;
  day_end TIME;
  current_time TIME;
  slot_end_time TIME;
BEGIN
  -- Get service settings
  SELECT * INTO settings FROM service_settings WHERE listing_id = p_listing_id;
  
  IF NOT FOUND OR NOT settings.booking_enabled THEN
    RETURN;
  END IF;
  
  -- Get working hours for the day
  day_name := LOWER(TO_CHAR(p_date, 'Day'));
  day_name := TRIM(day_name);
  
  working_hours := settings.working_hours->day_name;
  
  -- Check if working on this day
  IF NOT (working_hours->>'enabled')::boolean THEN
    RETURN;
  END IF;
  
  day_start := (working_hours->>'start')::TIME;
  day_end := (working_hours->>'end')::TIME;
  current_time := day_start;
  
  -- Generate slots throughout the day
  WHILE current_time + (p_service_duration || ' minutes')::INTERVAL <= day_end LOOP
    slot_end_time := current_time + (p_service_duration || ' minutes')::INTERVAL;
    
    -- Check if slot conflicts with existing bookings or busy times
    IF NOT EXISTS (
      SELECT 1 FROM bookings 
      WHERE provider_id = (SELECT user_id FROM listings WHERE id = p_listing_id)
      AND booking_date = p_date
      AND (
        (start_time <= current_time AND end_time > current_time) OR
        (start_time < slot_end_time AND end_time >= slot_end_time) OR
        (start_time >= current_time AND end_time <= slot_end_time)
      )
      AND status IN ('confirmed', 'pending')
    ) AND NOT EXISTS (
      SELECT 1 FROM provider_busy_times
      WHERE provider_id = (SELECT user_id FROM listings WHERE id = p_listing_id)
      AND DATE(start_time) = p_date
      AND (
        (start_time::TIME <= current_time AND end_time::TIME > current_time) OR
        (start_time::TIME < slot_end_time AND end_time::TIME >= slot_end_time) OR
        (start_time::TIME >= current_time AND end_time::TIME <= slot_end_time)
      )
      AND is_active = true
    ) THEN
      -- Slot is available
      RETURN QUERY SELECT current_time, slot_end_time, true;
    ELSE
      -- Slot is blocked
      RETURN QUERY SELECT current_time, slot_end_time, false;
    END IF;
    
    -- Move to next slot
    current_time := current_time + ((p_service_duration + settings.buffer_minutes) || ' minutes')::INTERVAL;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update service_settings updated_at
CREATE OR REPLACE FUNCTION update_service_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_service_settings_timestamp
  BEFORE UPDATE ON service_settings
  FOR EACH ROW EXECUTE FUNCTION update_service_settings_timestamp();

-- Update bookings updated_at
CREATE OR REPLACE FUNCTION update_bookings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bookings_timestamp
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_bookings_timestamp();

-- =====================================================
-- 11. VIEWS FOR EASY DATA ACCESS
-- =====================================================

-- View for listing availability summary
CREATE OR REPLACE VIEW listing_availability_summary AS
SELECT 
  l.id as listing_id,
  l.title,
  l.user_id as provider_id,
  u.name as provider_name,
  ss.booking_enabled,
  ss.service_type,
  ss.default_duration_minutes,
  ss.auto_confirm,
  ss.advance_booking_days,
  CASE 
    WHEN ss.calendar_connected THEN 'Connected'
    ELSE 'Manual'
  END as calendar_status,
  ss.last_sync_at,
  COUNT(CASE WHEN b.status IN ('pending', 'confirmed') THEN 1 END) as active_bookings_count,
  ss.created_at,
  ss.updated_at
FROM listings l
LEFT JOIN service_settings ss ON l.id = ss.listing_id
LEFT JOIN users u ON l.user_id = u.id
LEFT JOIN bookings b ON l.id = b.listing_id AND b.booking_date >= CURRENT_DATE
WHERE l.status = 'active'
GROUP BY l.id, l.title, l.user_id, u.name, ss.booking_enabled, ss.service_type, 
         ss.default_duration_minutes, ss.auto_confirm, ss.advance_booking_days, 
         ss.calendar_connected, ss.last_sync_at, ss.created_at, ss.updated_at;

-- View for provider booking dashboard
CREATE OR REPLACE VIEW provider_booking_dashboard AS
SELECT 
  b.id as booking_id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.service_name,
  b.service_price,
  b.status,
  b.customer_notes,
  b.created_at,
  
  -- Customer Information
  c.id as customer_id,
  c.name as customer_name,
  c.avatar_url as customer_avatar,
  c.phone as customer_phone,
  
  -- Listing Information
  l.title as listing_title,
  l.category as listing_category
  
FROM bookings b
JOIN users c ON b.customer_id = c.id
JOIN listings l ON b.listing_id = l.id
WHERE b.provider_id = auth.uid()
ORDER BY b.booking_date, b.start_time;

-- =====================================================
-- 12. SAMPLE DATA FOR TESTING
-- =====================================================

-- Note: This would be populated by the application
-- INSERT INTO service_settings (listing_id, booking_enabled, service_options) VALUES ...

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Run this script in your Supabase SQL Editor
-- Then update your application to use these new tables