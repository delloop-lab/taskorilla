-- Add company_name field to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS company_name TEXT;





