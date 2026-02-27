-- Add business_url column to map_markers for clickable marker links
ALTER TABLE public.map_markers
ADD COLUMN IF NOT EXISTS business_url TEXT;

