-- Step 7: Create view and grant permissions (simple version)
CREATE OR REPLACE VIEW user_rating_stats AS
SELECT 
  u.id as user_id,
  u.name,
  u.avatar_url,
  COALESCE(u.rating_as_described, 0) as rating_as_described,
  COALESCE(u.rating_timing, 0) as rating_timing,
  COALESCE(u.rating_communication, 0) as rating_communication,
  COALESCE(u.rating_cost, 0) as rating_cost,
  COALESCE(u.rating_performance, 0) as rating_performance,
  COALESCE(u.rating, 0) as overall_rating,
  COALESCE(u.total_reviews, 0) as total_reviews,
  COALESCE(u.positive_reviews, 0) as positive_reviews,
  CASE 
    WHEN COALESCE(u.total_reviews, 0) > 0 
    THEN ROUND((COALESCE(u.positive_reviews, 0)::DECIMAL / u.total_reviews) * 100)
    ELSE NULL 
  END as positive_percentage
FROM public.users u;

-- Grant permissions
GRANT SELECT ON user_rating_stats TO authenticated;
GRANT ALL ON reviews TO authenticated;