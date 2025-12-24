-- =====================================================
-- REVIEW INCENTIVES & EXTERNAL REVIEWS MIGRATION
-- =====================================================

-- 1. Add review incentive fields to reviews table
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS discount_coupon_id UUID REFERENCES booking_coupons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS incentive_rewarded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS incentive_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS incentive_type VARCHAR(20); -- 'discount', 'credit', 'points'

-- 2. Create external reviews table (Google, Yelp, etc.)
CREATE TABLE IF NOT EXISTS external_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  
  -- Source Information
  source VARCHAR(50) NOT NULL, -- 'google', 'yelp', 'facebook', 'trustpilot'
  external_review_id VARCHAR(255) NOT NULL,
  external_url TEXT,
  
  -- Review Details
  reviewer_name VARCHAR(255),
  reviewer_avatar_url TEXT,
  rating DECIMAL(2,1) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
  review_text TEXT,
  review_date TIMESTAMP,
  
  -- Response (if provider responded)
  provider_response TEXT,
  provider_response_date TIMESTAMP,
  
  -- Metadata
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  sync_enabled BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent duplicate imports
  UNIQUE(provider_id, source, external_review_id)
);

-- 3. Create review incentive settings table
CREATE TABLE IF NOT EXISTS review_incentive_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  
  -- Incentive Configuration
  enabled BOOLEAN DEFAULT true,
  incentive_type VARCHAR(20) DEFAULT 'discount', -- 'discount', 'credit', 'points'
  discount_percentage DECIMAL(5,2), -- e.g., 10.00 for 10%
  discount_amount DECIMAL(10,2), -- Fixed amount discount
  min_rating DECIMAL(2,1) DEFAULT 4.0, -- Minimum rating to get incentive
  require_text_review BOOLEAN DEFAULT false, -- Require written review text
  max_uses_per_customer INTEGER DEFAULT 1, -- How many times same customer can get incentive
  
  -- Auto-generate coupon settings
  auto_generate_coupon BOOLEAN DEFAULT true,
  coupon_code_prefix VARCHAR(20) DEFAULT 'REVIEW',
  coupon_valid_days INTEGER DEFAULT 30,
  
  -- Message
  incentive_message TEXT DEFAULT 'Thank you for your review! Here''s a discount for your next booking.',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(provider_id, listing_id)
);

-- 4. Create review incentive tracking table
CREATE TABLE IF NOT EXISTS review_incentive_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  coupon_id UUID REFERENCES booking_coupons(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Incentive Details
  incentive_type VARCHAR(20) NOT NULL,
  incentive_value DECIMAL(10,2) NOT NULL,
  coupon_code VARCHAR(50),
  
  -- Status
  claimed_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP,
  is_used BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Add Google Places integration fields
ALTER TABLE provider_profiles 
ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS google_business_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS google_reviews_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS google_reviews_last_sync TIMESTAMP;

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_discount_coupon_id ON reviews(discount_coupon_id);
CREATE INDEX IF NOT EXISTS idx_external_reviews_provider ON external_reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_external_reviews_listing ON external_reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_external_reviews_source ON external_reviews(source);
CREATE INDEX IF NOT EXISTS idx_review_incentive_settings_provider ON review_incentive_settings(provider_id);
CREATE INDEX IF NOT EXISTS idx_review_incentive_settings_listing ON review_incentive_settings(listing_id);
CREATE INDEX IF NOT EXISTS idx_review_incentive_claims_customer ON review_incentive_claims(customer_id);
CREATE INDEX IF NOT EXISTS idx_review_incentive_claims_review ON review_incentive_claims(review_id);

-- 7. Enable RLS
ALTER TABLE external_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_incentive_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_incentive_claims ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS Policies
-- External Reviews
CREATE POLICY "Users can view external reviews for their listings" ON external_reviews
  FOR SELECT USING (
    provider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM listings 
      WHERE listings.id = external_reviews.listing_id 
      AND listings.user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can manage their external reviews" ON external_reviews
  FOR ALL USING (provider_id = auth.uid());

-- Review Incentive Settings
CREATE POLICY "Providers can manage their incentive settings" ON review_incentive_settings
  FOR ALL USING (provider_id = auth.uid());

CREATE POLICY "Users can view active incentive settings" ON review_incentive_settings
  FOR SELECT USING (enabled = true);

-- Review Incentive Claims
CREATE POLICY "Users can view their own incentive claims" ON review_incentive_claims
  FOR SELECT USING (customer_id = auth.uid() OR provider_id = auth.uid());

CREATE POLICY "System can create incentive claims" ON review_incentive_claims
  FOR INSERT WITH CHECK (true);
