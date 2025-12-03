-- Helper Badge System
-- Automatically awards badges to helpers based on their performance

-- Function to calculate and update helper badges
CREATE OR REPLACE FUNCTION calculate_helper_badges(helper_user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  earned_badges TEXT[] := ARRAY[]::TEXT[];
  avg_response_time_hours NUMERIC;
  avg_rating NUMERIC;
  completed_tasks_count INTEGER;
  skills_count INTEGER;
  response_time_threshold NUMERIC := 2.0; -- 2 hours for Fast Responder
  top_helper_rating_threshold NUMERIC := 4.5; -- 4.5 stars minimum
  top_helper_tasks_threshold INTEGER := 10; -- 10+ completed tasks
  expert_skills_threshold INTEGER := 5; -- 5+ skills
BEGIN
  -- Get helper's skills count
  SELECT COALESCE(array_length(skills, 1), 0)
  INTO skills_count
  FROM profiles
  WHERE id = helper_user_id;
  
  -- Check Expert Skills badge
  IF skills_count >= expert_skills_threshold THEN
    earned_badges := array_append(earned_badges, 'Expert Skills');
  END IF;
  
  -- Get completed tasks count
  SELECT COUNT(*)
  INTO completed_tasks_count
  FROM tasks
  WHERE assigned_to = helper_user_id
    AND status = 'completed';
  
  -- Get average rating
  SELECT COALESCE(AVG(rating), 0)
  INTO avg_rating
  FROM reviews
  WHERE reviewee_id = helper_user_id;
  
  -- Check Top Helper badge
  IF avg_rating >= top_helper_rating_threshold AND completed_tasks_count >= top_helper_tasks_threshold THEN
    earned_badges := array_append(earned_badges, 'Top Helper');
  END IF;
  
  -- Calculate average response time (time between message received and reply sent)
  SELECT COALESCE(
    AVG(EXTRACT(EPOCH FROM (reply.created_at - msg.created_at)) / 3600.0), -- Convert to hours
    999 -- Default to high value if no responses
  )
  INTO avg_response_time_hours
  FROM messages msg
  LEFT JOIN LATERAL (
    SELECT created_at
    FROM messages
    WHERE conversation_id = msg.conversation_id
      AND sender_id = msg.receiver_id
      AND receiver_id = msg.sender_id
      AND created_at > msg.created_at
    ORDER BY created_at ASC
    LIMIT 1
  ) reply ON true
  WHERE msg.receiver_id = helper_user_id
    AND reply.created_at IS NOT NULL;
  
  -- Check Fast Responder badge (average response time < threshold)
  IF avg_response_time_hours < response_time_threshold AND avg_response_time_hours > 0 THEN
    earned_badges := array_append(earned_badges, 'Fast Responder');
  END IF;
  
  RETURN earned_badges;
END;
$$ LANGUAGE plpgsql;

-- Function to update badges for a helper
-- This function only updates automatic badges, preserving manual badges
CREATE OR REPLACE FUNCTION update_helper_badges(helper_user_id UUID)
RETURNS VOID AS $$
DECLARE
  calculated_badges TEXT[];
  current_badges TEXT[];
  manual_badges TEXT[] := ARRAY[]::TEXT[];
  final_badges TEXT[];
  badge_name TEXT;
BEGIN
  -- Get current badges
  SELECT COALESCE(badges, ARRAY[]::TEXT[])
  INTO current_badges
  FROM profiles
  WHERE id = helper_user_id;
  
  -- Calculate automatic badges
  calculated_badges := calculate_helper_badges(helper_user_id);
  
  -- If there are current badges that aren't in calculated badges, they might be manual
  -- For now, we'll merge: keep calculated badges and any existing badges that match available badge names
  -- This preserves manually assigned badges
  final_badges := calculated_badges;
  
  -- Add any existing badges that are valid badge names but not in calculated badges
  -- This preserves manually assigned badges
  FOREACH badge_name IN ARRAY current_badges
  LOOP
    IF badge_name = ANY(ARRAY['Fast Responder', 'Top Helper', 'Expert Skills']) 
       AND NOT (badge_name = ANY(calculated_badges)) THEN
      -- This is a manually assigned badge that wasn't auto-calculated, preserve it
      final_badges := array_append(final_badges, badge_name);
    END IF;
  END LOOP;
  
  -- Update profile with merged badges
  UPDATE profiles
  SET badges = final_badges
  WHERE id = helper_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update badges for all helpers (for batch updates)
CREATE OR REPLACE FUNCTION update_all_helper_badges()
RETURNS INTEGER AS $$
DECLARE
  helper_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  FOR helper_record IN 
    SELECT id FROM profiles WHERE is_helper = true
  LOOP
    PERFORM update_helper_badges(helper_record.id);
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to update badges when relevant data changes
CREATE OR REPLACE FUNCTION trigger_update_helper_badges()
RETURNS TRIGGER AS $$
BEGIN
  -- Update badges for the helper when:
  -- - A task is completed (assigned_to)
  -- - A review is added (reviewee_id)
  -- - A message is sent/received (sender_id or receiver_id)
  
  IF TG_TABLE_NAME = 'tasks' AND TG_OP = 'UPDATE' THEN
    IF NEW.status = 'completed' AND NEW.assigned_to IS NOT NULL THEN
      PERFORM update_helper_badges(NEW.assigned_to);
    END IF;
  ELSIF TG_TABLE_NAME = 'reviews' AND TG_OP = 'INSERT' THEN
    PERFORM update_helper_badges(NEW.reviewee_id);
  ELSIF TG_TABLE_NAME = 'messages' AND TG_OP = 'INSERT' THEN
    -- Update badges for both sender and receiver (response time affects receiver)
    IF NEW.receiver_id IN (SELECT id FROM profiles WHERE is_helper = true) THEN
      PERFORM update_helper_badges(NEW.receiver_id);
    END IF;
  ELSIF TG_TABLE_NAME = 'profiles' AND TG_OP = 'UPDATE' THEN
    -- Update badges when skills are updated
    IF NEW.is_helper = true AND (OLD.skills IS DISTINCT FROM NEW.skills) THEN
      PERFORM update_helper_badges(NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update badges
DROP TRIGGER IF EXISTS update_badges_on_task_completion ON tasks;
CREATE TRIGGER update_badges_on_task_completion
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND NEW.assigned_to IS NOT NULL)
  EXECUTE FUNCTION trigger_update_helper_badges();

DROP TRIGGER IF EXISTS update_badges_on_review ON reviews;
CREATE TRIGGER update_badges_on_review
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_helper_badges();

DROP TRIGGER IF EXISTS update_badges_on_message ON messages;
CREATE TRIGGER update_badges_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_helper_badges();

DROP TRIGGER IF EXISTS update_badges_on_profile_skills ON profiles;
CREATE TRIGGER update_badges_on_profile_skills
  AFTER UPDATE OF skills ON profiles
  FOR EACH ROW
  WHEN (NEW.is_helper = true)
  EXECUTE FUNCTION trigger_update_helper_badges();

-- Initial badge calculation for existing helpers
-- Uncomment to run immediately, or run manually:
-- SELECT update_all_helper_badges();

-- Add comments
COMMENT ON FUNCTION calculate_helper_badges IS 'Calculates which badges a helper has earned based on performance metrics';
COMMENT ON FUNCTION update_helper_badges IS 'Updates badges for a specific helper';
COMMENT ON FUNCTION update_all_helper_badges IS 'Updates badges for all helpers (batch operation)';

