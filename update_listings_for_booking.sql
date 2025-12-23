-- =====================================================
-- UPDATE LISTINGS TABLE FOR BOOKING SYSTEM
-- =====================================================
-- Add booking-related columns to existing listings table

-- Add booking system columns to listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS service_type VARCHAR(50) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Europe/London',
ADD COLUMN IF NOT EXISTS booking_advance_days INTEGER DEFAULT 30;

-- Create index for booking-enabled listings
CREATE INDEX IF NOT EXISTS idx_listings_booking_enabled 
ON listings(booking_enabled) WHERE booking_enabled = true;

-- Update existing listings to have proper timezone based on location
-- This is a basic mapping - in production you'd want more sophisticated geo-timezone mapping
UPDATE listings 
SET timezone = CASE 
  WHEN location_country = 'United Kingdom' OR location_country = 'UK' THEN 'Europe/London'
  WHEN location_country = 'United States' OR location_country = 'USA' THEN 'America/New_York'
  WHEN location_country = 'Germany' THEN 'Europe/Berlin'
  WHEN location_country = 'France' THEN 'Europe/Paris'
  WHEN location_country = 'Spain' THEN 'Europe/Madrid'
  WHEN location_country = 'Italy' THEN 'Europe/Rome'
  WHEN location_country = 'Australia' THEN 'Australia/Sydney'
  WHEN location_country = 'Canada' THEN 'America/Toronto'
  ELSE 'Europe/London' -- Default to London timezone
END
WHERE timezone IS NULL OR timezone = 'Europe/London';

-- Add comment to document the new columns
COMMENT ON COLUMN listings.booking_enabled IS 'Whether this listing accepts online bookings';
COMMENT ON COLUMN listings.service_type IS 'Type of service: general, appointment, consultation, class, etc.';
COMMENT ON COLUMN listings.timezone IS 'Timezone for booking calculations (IANA timezone identifier)';
COMMENT ON COLUMN listings.booking_advance_days IS 'How many days in advance customers can book';

-- =====================================================
-- SAMPLE DATA FOR TESTING BOOKABLE LISTINGS
-- =====================================================

-- Enable booking for some sample listings (adjust IDs as needed)
-- UPDATE listings 
-- SET 
--   booking_enabled = true,
--   service_type = 'appointment',
--   booking_advance_days = 14
-- WHERE category IN ('Beauty & Wellness', 'Health & Fitness', 'Professional Services')
-- AND user_id IS NOT NULL
-- LIMIT 5;