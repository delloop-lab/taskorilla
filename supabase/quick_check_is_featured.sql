-- Quick check for is_featured field
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'is_featured'
    ) THEN '✅ is_featured field EXISTS - Migration already applied'
    ELSE '❌ is_featured field MISSING - Need to run: add_is_featured_field.sql'
  END as status;


