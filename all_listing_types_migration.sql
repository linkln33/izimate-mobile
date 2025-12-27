-- =====================================================
-- ALL LISTING TYPES MIGRATION
-- Adds support for all listing types: Service, Goods, Rental, Experience, 
-- Digital Services, Transport, Gated Content, Fundraising
-- =====================================================

-- 1. Add listing_type column if it doesn't exist
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS listing_type VARCHAR(50) DEFAULT 'service';

-- Add constraint for listing_type values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'listings_listing_type_check'
  ) THEN
    ALTER TABLE listings 
    ADD CONSTRAINT listings_listing_type_check 
    CHECK (listing_type IN (
      'service', 'goods', 'rental', 'book', 'pdf', 
      'gated_content', 'experience', 'digital_services', 
      'fundraising', 'transportation'
    ));
  END IF;
END $$;

-- 2. SUBSCRIPTION FIELDS (for Service type)
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS subscription_billing_cycle VARCHAR(20), -- 'weekly', 'monthly', 'quarterly', 'yearly'
ADD COLUMN IF NOT EXISTS subscription_trial_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS subscription_auto_renew BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS subscription_features JSONB DEFAULT '[]'::jsonb;

-- Add constraint for subscription_billing_cycle
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'listings_subscription_billing_cycle_check'
  ) THEN
    ALTER TABLE listings 
    ADD CONSTRAINT listings_subscription_billing_cycle_check 
    CHECK (subscription_billing_cycle IS NULL OR subscription_billing_cycle IN ('weekly', 'monthly', 'quarterly', 'yearly'));
  END IF;
END $$;

-- 3. AUCTION FIELDS (for Goods type)
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS auction_start_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS auction_reserve_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS auction_end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auction_bid_increment DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS auction_buy_now_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS auction_current_bid DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS auction_status VARCHAR(20); -- 'upcoming', 'active', 'ended', 'sold', 'cancelled'

-- Add constraint for auction_status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'listings_auction_status_check'
  ) THEN
    ALTER TABLE listings 
    ADD CONSTRAINT listings_auction_status_check 
    CHECK (auction_status IS NULL OR auction_status IN ('upcoming', 'active', 'ended', 'sold', 'cancelled'));
  END IF;
END $$;

-- 4. EXPERIENCE FIELDS
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS experience_duration_hours INTEGER,
ADD COLUMN IF NOT EXISTS experience_max_participants INTEGER,
ADD COLUMN IF NOT EXISTS experience_min_age INTEGER,
ADD COLUMN IF NOT EXISTS experience_includes JSONB DEFAULT '[]'::jsonb, -- Array of strings
ADD COLUMN IF NOT EXISTS experience_meeting_point TEXT,
ADD COLUMN IF NOT EXISTS experience_cancellation_policy TEXT;

-- 5. DIGITAL SERVICES FIELDS (formerly Freelance)
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS freelance_category VARCHAR(50), -- 'ugc', 'design', 'writing', 'video', 'photography', 'social_media', 'consulting', 'other'
ADD COLUMN IF NOT EXISTS freelance_portfolio_url TEXT,
ADD COLUMN IF NOT EXISTS freelance_delivery_days INTEGER,
ADD COLUMN IF NOT EXISTS freelance_revisions_included INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS freelance_skills JSONB DEFAULT '[]'::jsonb; -- Array of strings

-- Add constraint for freelance_category
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'listings_freelance_category_check'
  ) THEN
    ALTER TABLE listings 
    ADD CONSTRAINT listings_freelance_category_check 
    CHECK (freelance_category IS NULL OR freelance_category IN ('ugc', 'design', 'writing', 'video', 'photography', 'social_media', 'consulting', 'other'));
  END IF;
END $$;

-- 6. RENTAL FIELDS (if not already added by rental_features_migration.sql)
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS rental_duration_type VARCHAR(20), -- 'hourly', 'daily', 'weekly', 'monthly'
ADD COLUMN IF NOT EXISTS rental_min_duration INTEGER,
ADD COLUMN IF NOT EXISTS rental_max_duration INTEGER,
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

-- 7. SPACE SHARING / COUCH-SURFING FIELDS (for Rental type)
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS space_type VARCHAR(50), -- 'parking', 'storage', 'workspace', 'event_venue', 'studio', 'kitchen', 'couchsurfing', 'other'
ADD COLUMN IF NOT EXISTS space_capacity INTEGER,
ADD COLUMN IF NOT EXISTS space_amenities JSONB DEFAULT '[]'::jsonb, -- Array of strings
ADD COLUMN IF NOT EXISTS space_hourly_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS space_daily_rate DECIMAL(10,2);

-- Add constraint for space_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'listings_space_type_check'
  ) THEN
    ALTER TABLE listings 
    ADD CONSTRAINT listings_space_type_check 
    CHECK (space_type IS NULL OR space_type IN ('parking', 'storage', 'workspace', 'event_venue', 'studio', 'kitchen', 'couchsurfing', 'other'));
  END IF;
END $$;

-- 8. FUNDRAISING FIELDS
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS fundraising_goal DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS fundraising_current_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fundraising_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fundraising_category VARCHAR(50), -- 'charity', 'personal', 'business', 'event', 'medical', 'education', 'other'
ADD COLUMN IF NOT EXISTS fundraising_beneficiary TEXT;

-- Add constraint for fundraising_category
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'listings_fundraising_category_check'
  ) THEN
    ALTER TABLE listings 
    ADD CONSTRAINT listings_fundraising_category_check 
    CHECK (fundraising_category IS NULL OR fundraising_category IN ('charity', 'personal', 'business', 'event', 'medical', 'education', 'other'));
  END IF;
END $$;

-- 9. TRANSPORTATION FIELDS
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(50), -- 'food', 'grocery', 'package', 'medicine', 'other'
ADD COLUMN IF NOT EXISTS delivery_radius_km INTEGER,
ADD COLUMN IF NOT EXISTS delivery_fee_structure VARCHAR(20), -- 'fixed', 'distance_based', 'weight_based'
ADD COLUMN IF NOT EXISTS delivery_estimated_time INTEGER, -- minutes
ADD COLUMN IF NOT EXISTS taxi_vehicle_type VARCHAR(20), -- 'standard', 'luxury', 'van', 'motorcycle', 'bike'
ADD COLUMN IF NOT EXISTS taxi_max_passengers INTEGER,
ADD COLUMN IF NOT EXISTS taxi_license_number VARCHAR(100);

-- Add constraints for transportation fields
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'listings_delivery_type_check'
  ) THEN
    ALTER TABLE listings 
    ADD CONSTRAINT listings_delivery_type_check 
    CHECK (delivery_type IS NULL OR delivery_type IN ('food', 'grocery', 'package', 'medicine', 'other'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'listings_delivery_fee_structure_check'
  ) THEN
    ALTER TABLE listings 
    ADD CONSTRAINT listings_delivery_fee_structure_check 
    CHECK (delivery_fee_structure IS NULL OR delivery_fee_structure IN ('fixed', 'distance_based', 'weight_based'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'listings_taxi_vehicle_type_check'
  ) THEN
    ALTER TABLE listings 
    ADD CONSTRAINT listings_taxi_vehicle_type_check 
    CHECK (taxi_vehicle_type IS NULL OR taxi_vehicle_type IN ('standard', 'luxury', 'van', 'motorcycle', 'bike'));
  END IF;
END $$;

-- 10. GATED CONTENT FIELDS (Patreon-like)
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS content_tiers JSONB DEFAULT '[]'::jsonb, -- Array of tier objects: {name, price, billing_cycle, description, features[]}
ADD COLUMN IF NOT EXISTS content_preview TEXT,
ADD COLUMN IF NOT EXISTS access_level VARCHAR(20); -- 'free', 'premium', 'vip' (legacy, can be removed if using tiers)

-- Add constraint for access_level
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'listings_access_level_check'
  ) THEN
    ALTER TABLE listings 
    ADD CONSTRAINT listings_access_level_check 
    CHECK (access_level IS NULL OR access_level IN ('free', 'premium', 'vip'));
  END IF;
END $$;

-- 11. GOODS-SPECIFIC FIELDS (if not already exists)
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER,
ADD COLUMN IF NOT EXISTS shipping_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2);

-- 12. UPDATE BUDGET_TYPE to include 'auction'
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'listings_budget_type_check'
  ) THEN
    -- Drop old constraint if exists
    ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_budget_type_check;
    
    -- Add new constraint with auction
    ALTER TABLE listings 
    ADD CONSTRAINT listings_budget_type_check 
    CHECK (budget_type IN ('fixed', 'range', 'hourly', 'price_list', 'auction'));
  END IF;
END $$;

-- 13. CREATE INDEXES for better query performance
CREATE INDEX IF NOT EXISTS idx_listings_listing_type ON listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_listings_auction_status ON listings(auction_status) WHERE auction_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_fundraising_category ON listings(fundraising_category) WHERE fundraising_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_freelance_category ON listings(freelance_category) WHERE freelance_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_space_type ON listings(space_type) WHERE space_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_rental_duration_type ON listings(rental_duration_type) WHERE rental_duration_type IS NOT NULL;

-- 14. ADD COMMENTS for documentation
COMMENT ON COLUMN listings.listing_type IS 'Type of listing: service, goods, rental, experience, digital_services, fundraising, transportation, gated_content';
COMMENT ON COLUMN listings.subscription_billing_cycle IS 'Billing cycle for subscription services: weekly, monthly, quarterly, yearly';
COMMENT ON COLUMN listings.subscription_features IS 'Array of features included in subscription (JSONB array)';
COMMENT ON COLUMN listings.auction_start_price IS 'Starting bid price for auction listings';
COMMENT ON COLUMN listings.auction_reserve_price IS 'Minimum acceptable bid (auction won''t sell below this)';
COMMENT ON COLUMN listings.auction_status IS 'Current status of auction: upcoming, active, ended, sold, cancelled';
COMMENT ON COLUMN listings.experience_includes IS 'Array of what''s included in the experience (JSONB array)';
COMMENT ON COLUMN listings.freelance_skills IS 'Array of skills for digital services (JSONB array)';
COMMENT ON COLUMN listings.space_type IS 'Type of space for rental: parking, storage, workspace, event_venue, studio, kitchen, couchsurfing, other';
COMMENT ON COLUMN listings.content_tiers IS 'Array of membership tiers for gated content (JSONB array of tier objects)';
COMMENT ON COLUMN listings.fundraising_goal IS 'Target fundraising amount';
COMMENT ON COLUMN listings.fundraising_current_amount IS 'Current amount raised';
