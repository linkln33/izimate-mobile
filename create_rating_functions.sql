-- Step 3: Create rating calculation function
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
  
  UPDATE public.users SET
    rating_as_described = avg_as_described,
    rating_timing = avg_timing,
    rating_communication = avg_communication,
    rating_cost = avg_cost,
    rating_performance = avg_performance,
    total_reviews = COALESCE(review_count, 0),
    positive_reviews = COALESCE(positive_count, 0),
    rating = COALESCE((avg_as_described + avg_timing + avg_communication + avg_cost + avg_performance) / 5, NULL)
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;