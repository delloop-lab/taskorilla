-- Delete user and all related data
-- Replace 'lou@schillaci.me' with the email you want to delete

DO $$
DECLARE
    user_id_to_delete UUID;
BEGIN
    -- Get the user ID
    SELECT id INTO user_id_to_delete
    FROM auth.users
    WHERE email = 'lou@schillaci.me';

    -- If user doesn't exist, exit
    IF user_id_to_delete IS NULL THEN
        RAISE NOTICE 'User not found';
        RETURN;
    END IF;

    -- Delete in order (respecting foreign key constraints)
    
    -- 1. Delete messages where user is sender or receiver
    DELETE FROM messages
    WHERE sender_id = user_id_to_delete
       OR receiver_id = user_id_to_delete;

    -- 2. Delete conversations involving the user
    DELETE FROM conversations
    WHERE participant1_id = user_id_to_delete
       OR participant2_id = user_id_to_delete;

    -- 3. Delete bids placed by the user
    DELETE FROM bids
    WHERE user_id = user_id_to_delete;

    -- 4. Delete tasks created by or assigned to the user
    DELETE FROM tasks
    WHERE created_by = user_id_to_delete
       OR assigned_to = user_id_to_delete;

    -- 5. Delete the profile
    DELETE FROM profiles
    WHERE id = user_id_to_delete;

    -- 6. Finally, delete from auth.users
    DELETE FROM auth.users
    WHERE id = user_id_to_delete;

    RAISE NOTICE 'User and all related data deleted successfully';
END $$;





