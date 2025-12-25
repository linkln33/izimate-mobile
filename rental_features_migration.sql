-- =====================================================
-- RENTAL FEATURES MIGRATION - Phase 1 (Basic Support)
-- =====================================================

-- Add rental-specific fields to listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS listing_type VARCHAR(20) DEFAULT 'service',
ADD COLUMN IF NOT EXISTS rental_duration_type VARCHAR(20), -- 'hourly', 'daily', 'weekly', 'monthly'
ADD COLUMN IF NOT EXISTS rental_min_duration INTEGER, -- Minimum rental period in days
ADD COLUMN IF NOT EXISTS rental_max_duration INTEGER, -- Maximum rental period in days
ADD COLUMN IF NOT EXISTS rental_rate_hourly DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS rental_rate_daily DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS rental_rate_weekly DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS rental_rate_monthly DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS cleaning_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS insurance_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(100),
ADD COLUMN IF NOT EXISTS pickup_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS condition_notes TEXT;

-- Add index for listing_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_listings_listing_type ON listings(listing_type);

-- Add index for rental duration type
CREATE INDEX IF NOT EXISTS idx_listings_rental_duration_type ON listings(rental_duration_type) WHERE listing_type = 'rental';

-- Add comment to listing_type column
COMMENT ON COLUMN listings.listing_type IS 'Type of listing: service, goods, rental, book, pdf, gated_content';
COMMENT ON COLUMN listings.rental_duration_type IS 'Rental pricing duration: hourly, daily, weekly, monthly';
COMMENT ON COLUMN listings.rental_min_duration IS 'Minimum rental period in days';
COMMENT ON COLUMN listings.rental_max_duration IS 'Maximum rental period in days';

