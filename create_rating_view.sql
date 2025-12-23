-- Step 7: Create view and grant permissions
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

-- Grant permissions
GRANT SELECT ON user_rating_stats TO authenticated;
GRANT ALL ON reviews TO authenticated;