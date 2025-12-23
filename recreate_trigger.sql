-- Recreate the trigger after fixing the reviews table
DROP TRIGGER IF EXISTS update_ratings_trigger ON reviews;

-- Recreate the trigger function (in case it was dropped)
CREATE OR REPLACE FUNCTION trigger_update_user_ratings()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_user_ratings(OLD.reviewee_id);
    RETURN OLD;
  ELSE
    PERFORM update_user_ratings(NEW.reviewee_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER update_ratings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_ratings();