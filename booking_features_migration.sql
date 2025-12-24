-- =====================================================
-- BOOKING FEATURES MIGRATION - FREE & EASY FEATURES
-- =====================================================

-- 1. Add blocked time/holidays table
CREATE TABLE IF NOT EXISTS provider_blocked_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  
  -- Block Details
  title VARCHAR(255) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  is_recurring_yearly BOOLEAN DEFAULT false, -- For holidays like Christmas
  
  -- Block Type
  block_type VARCHAR(20) DEFAULT 'personal', -- 'personal', 'holiday', 'break', 'unavailable'
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Add recurring appointments support to bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(50), -- 'daily', 'weekly', 'monthly'
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
ADD COLUMN IF NOT EXISTS recurrence_sequence INTEGER DEFAULT 0;

-- Add parent_booking_id separately to avoid constraint issues
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS parent_booking_id UUID;

-- Add foreign key constraint for parent_booking_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'bookings_parent_booking_id_fkey'
  ) THEN
    ALTER TABLE bookings 
    ADD CONSTRAINT bookings_parent_booking_id_fkey 
    FOREIGN KEY (parent_booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Add waitlist table
CREATE TABLE IF NOT EXISTS booking_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Waitlist Details
  preferred_date DATE,
  preferred_start_time TIME,
  preferred_end_time TIME,
  service_name VARCHAR(100),
  notes TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'notified', 'booked', 'cancelled'
  notified_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Add coupons/discount codes table
CREATE TABLE IF NOT EXISTS booking_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  
  -- Coupon Details
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255),
  description TEXT,
  
  -- Discount Type
  discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed_amount'
  discount_value DECIMAL(10,2) NOT NULL,
  
  -- Validity
  valid_from DATE,
  valid_until DATE,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  
  -- Conditions
  min_booking_amount DECIMAL(10,2),
  applicable_services JSONB, -- Array of service names
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Add coupon usage tracking
CREATE TABLE IF NOT EXISTS coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES booking_coupons(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  discount_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Add staff management table
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Business owner
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Staff member user account
  
  -- Staff Details
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'staff',
  
  -- Working Hours (JSON)
  working_hours JSONB DEFAULT '{
    "monday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "tuesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "wednesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "thursday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "friday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "saturday": {"enabled": false, "start": "09:00", "end": "15:00"},
    "sunday": {"enabled": false, "start": "10:00", "end": "16:00"}
  }'::jsonb,
  
  -- Assigned Services (JSON array of service names)
  assigned_services JSONB DEFAULT '[]'::jsonb,
  
  -- Time Off
  time_off JSONB DEFAULT '[]'::jsonb, -- Array of {start_date, end_date, reason}
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(provider_id, user_id)
);

-- 7. Add staff assignment to bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL;

-- 8. Add color coding to service options (in service_settings)
-- This will be stored in the service_options JSONB field

-- 9. Add client profile enhancements (extend users table if needed)
-- Most client data is already in users table, we'll use existing structure

-- 10. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_blocked_times_provider ON provider_blocked_times(provider_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_blocked_times_listing ON provider_blocked_times(listing_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_recurring ON bookings(is_recurring, parent_booking_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_listing ON booking_waitlist(listing_id, status);
CREATE INDEX IF NOT EXISTS idx_waitlist_customer ON booking_waitlist(customer_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON booking_coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_provider ON booking_coupons(provider_id, is_active);
CREATE INDEX IF NOT EXISTS idx_staff_provider ON staff_members(provider_id, is_active);
CREATE INDEX IF NOT EXISTS idx_bookings_staff ON bookings(staff_id);

-- 11. Enable RLS
ALTER TABLE provider_blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- 12. Basic RLS Policies (providers can manage their own data)
CREATE POLICY "Providers can manage their blocked times" ON provider_blocked_times
  FOR ALL USING (provider_id = auth.uid());

CREATE POLICY "Users can view waitlist for their listings" ON booking_waitlist
  FOR SELECT USING (
    customer_id = auth.uid() OR 
    provider_id = auth.uid() OR
    EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create waitlist entries" ON booking_waitlist
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Providers can manage their coupons" ON booking_coupons
  FOR ALL USING (provider_id = auth.uid());

CREATE POLICY "Users can view active coupons" ON booking_coupons
  FOR SELECT USING (is_active = true);

CREATE POLICY "Providers can manage their staff" ON staff_members
  FOR ALL USING (provider_id = auth.uid());
