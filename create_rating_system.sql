-- Rating System Database Schema
-- Run this in Supabase SQL Editor
--
-- Note: job_id is optional and can be NULL for general reviews
-- When you implement a jobs/matches table later, you can add the foreign key constraint:
-- ALTER TABLE reviews ADD CONSTRAINT fk_reviews_job_id FOREIGN KEY (job_id) REFERENCES jobs(id);

-- 1. Create reviews table for storing individual ratings
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID, -- Optional: References jobs table when implemented
  reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- 5 Rating Criteria (1.0-5.0 scale)
  as_described DECIMAL(2,1) NOT NULL CHECK (as_described >= 1.0 AND as_described <= 5.0),
  timing DECIMAL(2,1) NOT NULL CHECK (timing >= 1.0 AND timing <= 5.0),
  communication DECIMAL(2,1) NOT NULL CHECK (communication >= 1.0 AND communication <= 5.0),
  cost DECIMAL(2,1) NOT NULL CHECK (cost >= 1.0 AND cost <= 5.0),
  performance DECIMAL(2,1) NOT NULL CHECK (performance >= 1.0 AND performance <= 5.0),
  
  -- Overall rating (calculated average)
  overall_rating DECIMAL(2,1) GENERATED ALWAYS AS ((as_described + timing + communication + cost + performance) / 5) STORED,
  
  -- Optional text review
  review_text TEXT,
  
  -- Job/Service context
  service_type TEXT, -- e.g., 'web_design', 'photography', 'tutoring'
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK(reviewer_id != reviewee_id) -- Can't review yourself
);

-- 2. Add rating fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS rating_as_described DECIMAL(2,1) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rating_timing DECIMAL(2,1) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rating_communication DECIMAL(2,1) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rating_cost DECIMAL(2,1) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rating_performance DECIMAL(2,1) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS positive_reviews INTEGER DEFAULT 0;

-- 3. Create function to update user ratings after new review
CREATE OR REPLACE FUNCTION update_user_ratings(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  avg_as_described DECIMAL(2,1);
  avg_timing DECIMAL(2,1);
  avg_communication DECIMAL(2,1);
  avg_cost DECIMAL(2,1);
  avg_performance DECIMAL(2,1);
  review_count INTEGER;
  positive_count INTEGER;
BEGIN
  -- Calculate averages for each criterion
  SELECT 
    AVG(as_described),
    AVG(timing),
    AVG(communication),
    AVG(cost),
    AVG(performance),
    COUNT(*),
    COUNT(CASE WHEN overall_rating >= 4.0 THEN 1 END)
  INTO 
    avg_as_described,
    avg_timing,
    avg_communication,
    avg_cost,
    avg_performance,
    review_count,
    positive_count
  FROM reviews 
  WHERE reviewee_id = target_user_id;
  
  -- Update user's rating fields
  UPDATE public.users SET
    rating_as_described = avg_as_described,
    rating_timing = avg_timing,
    rating_communication = avg_communication,
    rating_cost = avg_cost,
    rating_performance = avg_performance,
    total_reviews = COALESCE(review_count, 0),
    positive_reviews = COALESCE(positive_count, 0),
    rating = COALESCE((avg_as_described + avg_timing + avg_communication + avg_cost + avg_performance) / 5, NULL),
    updated_at = NOW()
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger to automatically update ratings when reviews change
CREATE OR REPLACE FUNCTION trigger_update_user_ratings()
RETURNS TRIGGER AS $$
BEGIN
  -- Update ratings for the reviewee
  IF TG_OP = 'DELETE' THEN
    PERFORM update_user_ratings(OLD.reviewee_id);
    RETURN OLD;
  ELSE
    PERFORM update_user_ratings(NEW.reviewee_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_ratings_trigger ON reviews;
CREATE TRIGGER update_ratings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_ratings();

-- 5. Create RLS policies for reviews table
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Users can read reviews about them or reviews they wrote
CREATE POLICY "Users can read their own reviews" ON reviews
  FOR SELECT USING (
    auth.uid() = reviewer_id OR 
    auth.uid() = reviewee_id
  );

-- Users can insert reviews (as reviewer)
CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    reviewer_id != reviewee_id
  );

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews" ON reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

-- 6. Create indexes for performance (only if reviews table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reviews') THEN
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);
    
    -- Create job_id index only if column exists
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'job_id') THEN
      CREATE INDEX IF NOT EXISTS idx_reviews_job_id ON reviews(job_id) WHERE job_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_job_reviewer 
      ON reviews(job_id, reviewer_id) 
      WHERE job_id IS NOT NULL;
    END IF;
  END IF;
END
$$;

-- 7. Create view for easy rating statistics
CREATE OR REPLACE VIEW user_rating_stats AS
SELECT 
  u.id as user_id,
  u.name,
  u.avatar_url,
  u.rating_as_described,
  u.rating_timing,
  u.rating_communication,
  u.rating_cost,
  u.rating_performance,
  u.rating as overall_rating,
  u.total_reviews,
  u.positive_reviews,
  CASE 
    WHEN u.total_reviews > 0 
    THEN ROUND((u.positive_reviews::DECIMAL / u.total_reviews) * 100)
    ELSE NULL 
  END as positive_percentage
FROM public.users u;

-- Grant necessary permissions
GRANT SELECT ON user_rating_stats TO authenticated;
GRANT ALL ON reviews TO authenticated;

-- Insert some sample reviews for testing (optional)
-- You can remove this section if you don't want sample data
/*
INSERT INTO reviews (reviewer_id, reviewee_id, as_described, timing, communication, cost, performance, review_text, service_type)
SELECT 
  (SELECT id FROM public.users LIMIT 1 OFFSET 0) as reviewer_id,
  (SELECT id FROM public.users LIMIT 1 OFFSET 1) as reviewee_id,
  4.5, 4.0, 4.8, 4.2, 4.3,
  'Great work! Very professional and delivered on time.',
  'web_design'
WHERE (SELECT COUNT(*) FROM public.users) >= 2;
*/