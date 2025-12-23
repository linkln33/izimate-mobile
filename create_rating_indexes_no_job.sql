-- Step 6: Create indexes for performance (without job_id references)
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);