-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);

-- Create job_id index (only if you plan to use job references)
CREATE INDEX IF NOT EXISTS idx_reviews_job_id ON reviews(job_id) WHERE job_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_job_reviewer 
ON reviews(job_id, reviewer_id) 
WHERE job_id IS NOT NULL;