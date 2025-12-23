-- Fix reviews table - drop and recreate with correct structure
DROP TABLE IF EXISTS reviews CASCADE;

-- Create reviews table with correct column names
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  as_described DECIMAL(2,1) NOT NULL CHECK (as_described >= 1.0 AND as_described <= 5.0),
  timing DECIMAL(2,1) NOT NULL CHECK (timing >= 1.0 AND timing <= 5.0),
  communication DECIMAL(2,1) NOT NULL CHECK (communication >= 1.0 AND communication <= 5.0),
  cost DECIMAL(2,1) NOT NULL CHECK (cost >= 1.0 AND cost <= 5.0),
  performance DECIMAL(2,1) NOT NULL CHECK (performance >= 1.0 AND performance <= 5.0),
  overall_rating DECIMAL(2,1) GENERATED ALWAYS AS ((as_described + timing + communication + cost + performance) / 5) STORED,
  review_text TEXT,
  service_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK(reviewer_id != reviewee_id)
);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read their own reviews" ON reviews
  FOR SELECT USING (
    auth.uid() = reviewer_id OR 
    auth.uid() = reviewee_id
  );

CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    reviewer_id != reviewee_id
  );

CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete their own reviews" ON reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

-- Create indexes
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);

-- Grant permissions
GRANT ALL ON reviews TO authenticated;