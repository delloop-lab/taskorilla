-- Seed common categories and sub-categories
-- This is idempotent - safe to run multiple times

-- Main Categories
INSERT INTO categories (id, name, slug, parent_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Home & Garden', 'home-garden', NULL),
  ('550e8400-e29b-41d4-a716-446655440002', 'Cleaning', 'cleaning', NULL),
  ('550e8400-e29b-41d4-a716-446655440003', 'Moving & Delivery', 'moving-delivery', NULL),
  ('550e8400-e29b-41d4-a716-446655440004', 'Handyman', 'handyman', NULL),
  ('550e8400-e29b-41d4-a716-446655440005', 'Tech & IT', 'tech-it', NULL),
  ('550e8400-e29b-41d4-a716-446655440006', 'Events & Photography', 'events-photography', NULL),
  ('550e8400-e29b-41d4-a716-446655440007', 'Business & Admin', 'business-admin', NULL),
  ('550e8400-e29b-41d4-a716-446655440008', 'Health & Beauty', 'health-beauty', NULL),
  ('550e8400-e29b-41d4-a716-446655440009', 'Tutoring & Lessons', 'tutoring-lessons', NULL),
  ('550e8400-e29b-41d4-a716-446655440010', 'Other', 'other', NULL)
ON CONFLICT (slug) DO NOTHING;

-- Home & Garden Sub-categories
INSERT INTO categories (id, name, slug, parent_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440011', 'Gardening', 'gardening', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655440012', 'Lawn Mowing', 'lawn-mowing', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655440013', 'Painting', 'painting', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655440014', 'Fencing', 'fencing', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655440015', 'Decking', 'decking', '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (slug) DO NOTHING;

-- Cleaning Sub-categories
INSERT INTO categories (id, name, slug, parent_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440016', 'House Cleaning', 'house-cleaning', '550e8400-e29b-41d4-a716-446655440002'),
  ('550e8400-e29b-41d4-a716-446655440017', 'Office Cleaning', 'office-cleaning', '550e8400-e29b-41d4-a716-446655440002'),
  ('550e8400-e29b-41d4-a716-446655440018', 'Carpet Cleaning', 'carpet-cleaning', '550e8400-e29b-41d4-a716-446655440002'),
  ('550e8400-e29b-41d4-a716-446655440019', 'Window Cleaning', 'window-cleaning', '550e8400-e29b-41d4-a716-446655440002'),
  ('550e8400-e29b-41d4-a716-446655440020', 'End of Lease Cleaning', 'end-of-lease-cleaning', '550e8400-e29b-41d4-a716-446655440002')
ON CONFLICT (slug) DO NOTHING;

-- Moving & Delivery Sub-categories
INSERT INTO categories (id, name, slug, parent_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440021', 'Furniture Removal', 'furniture-removal', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655440022', 'House Moving', 'house-moving', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655440023', 'Delivery', 'delivery', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655440024', 'Packing & Unpacking', 'packing-unpacking', '550e8400-e29b-41d4-a716-446655440003'),
  -- New categories with user-requested names
  ('550e8400-e29b-41d4-a716-446655440056', 'Waste & Furniture Removal', 'waste-furniture-removal', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655440057', 'Moving Help', 'moving-help', '550e8400-e29b-41d4-a716-446655440003'),
  ('550e8400-e29b-41d4-a716-446655440058', 'Heavy Lifting & Loading', 'heavy-lifting-loading', '550e8400-e29b-41d4-a716-446655440003')
ON CONFLICT (slug) DO NOTHING;

-- Handyman Sub-categories
INSERT INTO categories (id, name, slug, parent_id) VALUES
  -- Original categories (kept for backward compatibility)
  ('550e8400-e29b-41d4-a716-446655440025', 'Plumbing', 'plumbing', '550e8400-e29b-41d4-a716-446655440004'),
  ('550e8400-e29b-41d4-a716-446655440026', 'Electrical', 'electrical', '550e8400-e29b-41d4-a716-446655440004'),
  ('550e8400-e29b-41d4-a716-446655440027', 'Carpentry', 'carpentry', '550e8400-e29b-41d4-a716-446655440004'),
  ('550e8400-e29b-41d4-a716-446655440028', 'Assembly', 'assembly', '550e8400-e29b-41d4-a716-446655440004'),
  ('550e8400-e29b-41d4-a716-446655440029', 'General Repairs', 'general-repairs', '550e8400-e29b-41d4-a716-446655440004'),
  -- New categories with user-requested names
  ('550e8400-e29b-41d4-a716-446655440050', 'Plumbing Help', 'plumbing-help', '550e8400-e29b-41d4-a716-446655440004'),
  ('550e8400-e29b-41d4-a716-446655440051', 'Electrical Help', 'electrical-help', '550e8400-e29b-41d4-a716-446655440004'),
  ('550e8400-e29b-41d4-a716-446655440052', 'Light Carpentry', 'light-carpentry', '550e8400-e29b-41d4-a716-446655440004'),
  ('550e8400-e29b-41d4-a716-446655440053', 'Furniture Assembly', 'furniture-assembly', '550e8400-e29b-41d4-a716-446655440004'),
  ('550e8400-e29b-41d4-a716-446655440054', 'Minor Home Repairs', 'minor-home-repairs', '550e8400-e29b-41d4-a716-446655440004'),
  ('550e8400-e29b-41d4-a716-446655440055', 'Mounting', 'mounting', '550e8400-e29b-41d4-a716-446655440004')
ON CONFLICT (slug) DO NOTHING;

-- Tech & IT Sub-categories
INSERT INTO categories (id, name, slug, parent_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440030', 'Computer Repair', 'computer-repair', '550e8400-e29b-41d4-a716-446655440005'),
  ('550e8400-e29b-41d4-a716-446655440031', 'Phone Repair', 'phone-repair', '550e8400-e29b-41d4-a716-446655440005'),
  ('550e8400-e29b-41d4-a716-446655440032', 'IT Support', 'it-support', '550e8400-e29b-41d4-a716-446655440005'),
  ('550e8400-e29b-41d4-a716-446655440033', 'Website Development', 'website-development', '550e8400-e29b-41d4-a716-446655440005')
ON CONFLICT (slug) DO NOTHING;

-- Events & Photography Sub-categories
INSERT INTO categories (id, name, slug, parent_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440034', 'Event Planning', 'event-planning', '550e8400-e29b-41d4-a716-446655440006'),
  ('550e8400-e29b-41d4-a716-446655440035', 'Photography', 'photography', '550e8400-e29b-41d4-a716-446655440006'),
  ('550e8400-e29b-41d4-a716-446655440036', 'Videography', 'videography', '550e8400-e29b-41d4-a716-446655440006')
ON CONFLICT (slug) DO NOTHING;

-- Business & Admin Sub-categories
INSERT INTO categories (id, name, slug, parent_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440037', 'Data Entry', 'data-entry', '550e8400-e29b-41d4-a716-446655440007'),
  ('550e8400-e29b-41d4-a716-446655440038', 'Virtual Assistant', 'virtual-assistant', '550e8400-e29b-41d4-a716-446655440007'),
  ('550e8400-e29b-41d4-a716-446655440039', 'Bookkeeping', 'bookkeeping', '550e8400-e29b-41d4-a716-446655440007')
ON CONFLICT (slug) DO NOTHING;

-- Health & Beauty Sub-categories
INSERT INTO categories (id, name, slug, parent_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440040', 'Haircut', 'haircut', '550e8400-e29b-41d4-a716-446655440008'),
  ('550e8400-e29b-41d4-a716-446655440041', 'Massage', 'massage', '550e8400-e29b-41d4-a716-446655440008'),
  ('550e8400-e29b-41d4-a716-446655440042', 'Makeup', 'makeup', '550e8400-e29b-41d4-a716-446655440008')
ON CONFLICT (slug) DO NOTHING;

-- Tutoring & Lessons Sub-categories
INSERT INTO categories (id, name, slug, parent_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440043', 'Academic Tutoring', 'academic-tutoring', '550e8400-e29b-41d4-a716-446655440009'),
  ('550e8400-e29b-41d4-a716-446655440044', 'Music Lessons', 'music-lessons', '550e8400-e29b-41d4-a716-446655440009'),
  ('550e8400-e29b-41d4-a716-446655440045', 'Language Lessons', 'language-lessons', '550e8400-e29b-41d4-a716-446655440009')
ON CONFLICT (slug) DO NOTHING;

-- Personal Assistance (New Main Category)
INSERT INTO categories (id, name, slug, parent_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440059', 'Personal Assistance', 'personal-assistance', NULL)
ON CONFLICT (slug) DO NOTHING;




