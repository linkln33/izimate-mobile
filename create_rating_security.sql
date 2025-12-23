-- Step 5: Enable RLS and create policies
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