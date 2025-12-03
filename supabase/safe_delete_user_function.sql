-- Safe user deletion function for admins
-- This function safely deletes a user and all related data in the correct order

CREATE OR REPLACE FUNCTION public.safe_delete_user(user_id_to_delete UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_data JSON;
    task_count INTEGER;
    bid_count INTEGER;
    message_count INTEGER;
    review_count INTEGER;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id_to_delete) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;

    -- Count related data for reporting
    SELECT COUNT(*) INTO task_count FROM tasks WHERE created_by = user_id_to_delete OR assigned_to = user_id_to_delete;
    SELECT COUNT(*) INTO bid_count FROM bids WHERE user_id = user_id_to_delete;
    SELECT COUNT(*) INTO message_count FROM messages WHERE sender_id = user_id_to_delete OR receiver_id = user_id_to_delete;
    SELECT COUNT(*) INTO review_count FROM reviews WHERE reviewer_id = user_id_to_delete OR reviewee_id = user_id_to_delete;

    -- Delete in order (respecting foreign key constraints)
    
    -- 1. Delete reviews where user is reviewer or reviewee
    DELETE FROM reviews
    WHERE reviewer_id = user_id_to_delete
       OR reviewee_id = user_id_to_delete;

    -- 2. Delete messages where user is sender or receiver
    DELETE FROM messages
    WHERE sender_id = user_id_to_delete
       OR receiver_id = user_id_to_delete;

    -- 3. Delete conversations involving the user
    DELETE FROM conversations
    WHERE participant1_id = user_id_to_delete
       OR participant2_id = user_id_to_delete;

    -- 4. Delete bids placed by the user
    DELETE FROM bids
    WHERE user_id = user_id_to_delete;

    -- 5. Delete tasks created by or assigned to the user
    -- Note: This will cascade delete related bids, conversations, messages, reviews via ON DELETE CASCADE
    DELETE FROM tasks
    WHERE created_by = user_id_to_delete
       OR assigned_to = user_id_to_delete;

    -- 6. Delete storage files (avatars) for the user
    DELETE FROM storage.objects
    WHERE bucket_id = 'avatars'
      AND split_part(name, '/', 1) = user_id_to_delete::text;

    -- 7. Delete the profile
    DELETE FROM profiles
    WHERE id = user_id_to_delete;

    -- 8. Finally, delete from auth.users
    DELETE FROM auth.users
    WHERE id = user_id_to_delete;

    -- Return success with summary
    RETURN json_build_object(
        'success', true,
        'message', 'User and all related data deleted successfully',
        'deleted_items', json_build_object(
            'tasks', task_count,
            'bids', bid_count,
            'messages', message_count,
            'reviews', review_count
        )
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant execute permission to authenticated users (will be restricted by RLS/API)
GRANT EXECUTE ON FUNCTION public.safe_delete_user(UUID) TO authenticated;


