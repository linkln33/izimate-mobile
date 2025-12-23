-- Create reviews table without job_id (simpler version)
CREATE TABLE IF NOT EXISTS reviews (
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