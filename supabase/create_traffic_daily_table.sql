-- Create traffic_daily table to track daily page visits
-- This allows us to see hits per day for each page

CREATE TABLE IF NOT EXISTS traffic_daily (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  page TEXT NOT NULL,
  visit_date DATE NOT NULL,
  visits INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(page, visit_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_traffic_daily_page ON traffic_daily(page);
CREATE INDEX IF NOT EXISTS idx_traffic_daily_date ON traffic_daily(visit_date);
CREATE INDEX IF NOT EXISTS idx_traffic_daily_page_date ON traffic_daily(page, visit_date DESC);

-- Enable RLS
ALTER TABLE traffic_daily ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read traffic data (it's aggregated, no sensitive info)
CREATE POLICY "Anyone can view traffic daily data"
  ON traffic_daily FOR SELECT
  USING (true);

-- Allow anyone to insert/update traffic data (anonymous tracking)
CREATE POLICY "Anyone can insert traffic daily data"
  ON traffic_daily FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update traffic daily data"
  ON traffic_daily FOR UPDATE
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_traffic_daily_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_traffic_daily_updated_at ON traffic_daily;
CREATE TRIGGER update_traffic_daily_updated_at
  BEFORE UPDATE ON traffic_daily
  FOR EACH ROW EXECUTE FUNCTION public.handle_traffic_daily_updated_at();

