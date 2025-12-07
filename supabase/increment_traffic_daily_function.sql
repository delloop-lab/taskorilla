-- Create a function to atomically increment traffic_daily visits
-- This eliminates race conditions by handling insert/update in a single atomic operation

CREATE OR REPLACE FUNCTION increment_traffic_daily(
  p_page TEXT,
  p_visit_date DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO traffic_daily (page, visit_date, visits)
  VALUES (p_page, p_visit_date, 1)
  ON CONFLICT (page, visit_date)
  DO UPDATE SET 
    visits = traffic_daily.visits + 1,
    updated_at = TIMEZONE('utc', NOW());
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION increment_traffic_daily(TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_traffic_daily(TEXT, DATE) TO anon;







