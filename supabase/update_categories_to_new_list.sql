-- Update main categories to new list
-- Run this migration to apply the new category names

-- 1. Cleaning → Cleaning & Home Services
UPDATE categories SET name = 'Cleaning & Home Services', slug = 'cleaning-home-services' WHERE slug = 'cleaning';

-- 2. Health & Beauty → Health & Beauty (display name)
UPDATE categories SET name = 'Health & Beauty', slug = 'health-beauty-wellbeing' WHERE slug IN ('health-beauty', 'health-beauty-wellbeing');

-- 3. Home & Garden (unchanged name, keep slug)
-- No change needed

-- 4. Handyman → Handyman & Maintenance
UPDATE categories SET name = 'Handyman & Maintenance', slug = 'handyman-maintenance' WHERE slug = 'handyman';

-- 5. Events & Photography → Events, Photography & Media
UPDATE categories SET name = 'Events, Photography & Media', slug = 'events-photography-media' WHERE slug = 'events-photography';

-- 6. Moving & Delivery (unchanged)
-- No change needed

-- 7. Tutoring & Lessons (unchanged)
-- No change needed

-- 8. Tech & IT (unchanged)
-- No change needed

-- 9. Business & Admin / Personal & Lifestyle → Business & Professional Services (reuse same id, subcategories stay)
UPDATE categories SET name = 'Business & Professional Services', slug = 'personal-lifestyle-services' WHERE id = '550e8400-e29b-41d4-a716-446655440007' OR slug = 'personal-lifestyle-services';

-- If Personal Assistance (059) exists, move its subcategories to 007 and remove 059
UPDATE categories SET parent_id = '550e8400-e29b-41d4-a716-446655440007' WHERE parent_id = '550e8400-e29b-41d4-a716-446655440059';
UPDATE tasks SET category_id = '550e8400-e29b-41d4-a716-446655440007' WHERE category_id = '550e8400-e29b-41d4-a716-446655440059';
DELETE FROM categories WHERE id = '550e8400-e29b-41d4-a716-446655440059';

-- 10. Other (unchanged)
-- No change needed
