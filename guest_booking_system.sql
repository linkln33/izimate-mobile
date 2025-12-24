-- Guest Booking System Migration
-- This adds support for guest users and guest bookings

-- Create guest_users table for temporary guest user data
CREATE TABLE IF NOT EXISTS guest_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  email_opt_in BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for guest_users
CREATE INDEX IF NOT EXISTS idx_guest_users_email ON guest_users(email);
CREATE INDEX IF NOT EXISTS idx_guest_users_created_at ON guest_users(created_at);

-- Add guest booking support to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS guest_booking BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS guest_customer_id UUID REFERENCES guest_users(id);

-- Create index for guest bookings
CREATE INDEX IF NOT EXISTS idx_bookings_guest_customer ON bookings(guest_customer_id) WHERE guest_booking = true;

-- Update bookings table to make customer_id nullable for guest bookings
ALTER TABLE bookings ALTER COLUMN customer_id DROP NOT NULL;

-- Add constraint to ensure either customer_id or guest_customer_id is set
ALTER TABLE bookings 
ADD CONSTRAINT check_customer_or_guest 
CHECK (
  (customer_id IS NOT NULL AND guest_customer_id IS NULL AND guest_booking = false) OR
  (customer_id IS NULL AND guest_customer_id IS NOT NULL AND guest_booking = true)
);

-- Create guest_booking_conversions table to track when guests become users
CREATE TABLE IF NOT EXISTS guest_booking_conversions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_user_id UUID NOT NULL REFERENCES guest_users(id),
  user_id UUID NOT NULL REFERENCES users(id),
  booking_ids UUID[] NOT NULL, -- Array of booking IDs that were converted
  converted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for guest_users
ALTER TABLE guest_users ENABLE ROW LEVEL SECURITY;

-- Policy: Guest users can only be read by system/admin
CREATE POLICY "Guest users readable by system" ON guest_users
  FOR SELECT USING (true); -- System can read all guest users

-- Policy: Guest users can be inserted by anyone (for guest checkout)
CREATE POLICY "Guest users insertable by anyone" ON guest_users
  FOR INSERT WITH CHECK (true);

-- Policy: Guest users can be updated by system only
CREATE POLICY "Guest users updatable by system" ON guest_users
  FOR UPDATE USING (true);

-- Add RLS policies for guest bookings
-- Update existing booking policies to handle guest bookings

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;

-- Recreate policies with guest booking support
CREATE POLICY "Users can view their own bookings or guest bookings" ON bookings
  FOR SELECT USING (
    customer_id = auth.uid() OR 
    provider_id = auth.uid() OR
    guest_booking = true -- Allow system to read guest bookings
  );

CREATE POLICY "Users can create bookings including guest bookings" ON bookings
  FOR INSERT WITH CHECK (
    provider_id = auth.uid() OR 
    customer_id = auth.uid() OR
    guest_booking = true -- Allow guest booking creation
  );

CREATE POLICY "Users can update their own bookings or guest bookings" ON bookings
  FOR UPDATE USING (
    customer_id = auth.uid() OR 
    provider_id = auth.uid() OR
    guest_booking = true -- Allow system to update guest bookings
  );

-- Add RLS policies for guest_booking_conversions
ALTER TABLE guest_booking_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversions" ON guest_booking_conversions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage conversions" ON guest_booking_conversions
  FOR ALL USING (true);

-- Create function to convert guest booking to user booking
CREATE OR REPLACE FUNCTION convert_guest_to_user(
  p_guest_email TEXT,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_guest_user_id UUID;
  v_booking_ids UUID[];
  v_updated_count INTEGER;
BEGIN
  -- Find the guest user by email
  SELECT id INTO v_guest_user_id
  FROM guest_users
  WHERE email = p_guest_email;

  IF v_guest_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Guest user not found');
  END IF;

  -- Get all booking IDs for this guest
  SELECT ARRAY_AGG(id) INTO v_booking_ids
  FROM bookings
  WHERE guest_customer_id = v_guest_user_id AND guest_booking = true;

  IF v_booking_ids IS NULL OR array_length(v_booking_ids, 1) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'No guest bookings found');
  END IF;

  -- Update bookings to convert from guest to user
  UPDATE bookings
  SET 
    customer_id = p_user_id,
    guest_customer_id = NULL,
    guest_booking = false,
    updated_at = NOW()
  WHERE guest_customer_id = v_guest_user_id AND guest_booking = true;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Record the conversion
  INSERT INTO guest_booking_conversions (guest_user_id, user_id, booking_ids)
  VALUES (v_guest_user_id, p_user_id, v_booking_ids);

  RETURN json_build_object(
    'success', true,
    'converted_bookings', v_updated_count,
    'booking_ids', v_booking_ids
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get guest booking details
CREATE OR REPLACE FUNCTION get_guest_booking_details(p_booking_id UUID)
RETURNS JSON AS $$
DECLARE
  v_booking_data JSON;
BEGIN
  SELECT json_build_object(
    'booking', json_build_object(
      'id', b.id,
      'start_time', b.start_time,
      'end_time', b.end_time,
      'service_name', b.service_name,
      'service_price', b.service_price,
      'currency', b.currency,
      'status', b.status,
      'customer_notes', b.customer_notes,
      'provider_notes', b.provider_notes,
      'metadata', b.metadata
    ),
    'guest_customer', json_build_object(
      'id', g.id,
      'name', g.name,
      'email', g.email,
      'phone', g.phone
    ),
    'provider', json_build_object(
      'id', u.id,
      'name', u.name,
      'email', u.email,
      'avatar_url', u.avatar_url
    ),
    'listing', json_build_object(
      'id', l.id,
      'title', l.title,
      'category', l.category
    )
  ) INTO v_booking_data
  FROM bookings b
  LEFT JOIN guest_users g ON b.guest_customer_id = g.id
  LEFT JOIN users u ON b.provider_id = u.id
  LEFT JOIN listings l ON b.listing_id = l.id
  WHERE b.id = p_booking_id AND b.guest_booking = true;

  RETURN COALESCE(v_booking_data, json_build_object('error', 'Booking not found'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at trigger for guest_users
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guest_users_updated_at
  BEFORE UPDATE ON guest_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE guest_users IS 'Temporary user data for guest checkout bookings';
COMMENT ON TABLE guest_booking_conversions IS 'Tracks conversion of guest bookings to registered user bookings';
COMMENT ON FUNCTION convert_guest_to_user IS 'Converts guest bookings to user bookings when guest creates account';
COMMENT ON FUNCTION get_guest_booking_details IS 'Retrieves complete guest booking information including guest and provider details';

-- Create view for guest booking analytics
CREATE OR REPLACE VIEW guest_booking_analytics AS
SELECT 
  DATE_TRUNC('day', b.created_at) as booking_date,
  COUNT(*) as total_guest_bookings,
  COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
  AVG(b.service_price) as avg_booking_value,
  COUNT(DISTINCT g.email) as unique_guest_customers
FROM bookings b
JOIN guest_users g ON b.guest_customer_id = g.id
WHERE b.guest_booking = true
GROUP BY DATE_TRUNC('day', b.created_at)
ORDER BY booking_date DESC;

COMMENT ON VIEW guest_booking_analytics IS 'Analytics view for guest booking performance and conversion tracking';
