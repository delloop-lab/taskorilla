-- Archive a user: anonymize PII but preserve all messages, bids, tasks and reviews for audit.
-- The auth.users row is deleted so the person cannot log in again.

CREATE OR REPLACE FUNCTION public.safe_archive_user(user_id_to_archive UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    task_count   INTEGER;
    bid_count    INTEGER;
    message_count INTEGER;
    review_count INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_id_to_archive) THEN
        RETURN json_build_object('success', false, 'error', 'Profile not found');
    END IF;

    IF EXISTS (SELECT 1 FROM profiles WHERE id = user_id_to_archive AND archived_at IS NOT NULL) THEN
        RETURN json_build_object('success', false, 'error', 'User is already archived');
    END IF;

    -- Counts for the summary returned to admin
    SELECT COUNT(*) INTO task_count   FROM tasks    WHERE created_by = user_id_to_archive OR assigned_to = user_id_to_archive;
    SELECT COUNT(*) INTO bid_count    FROM bids     WHERE user_id   = user_id_to_archive;
    SELECT COUNT(*) INTO message_count FROM messages WHERE sender_id = user_id_to_archive OR receiver_id = user_id_to_archive;
    SELECT COUNT(*) INTO review_count FROM reviews  WHERE reviewer_id = user_id_to_archive OR reviewee_id = user_id_to_archive;

    -- Anonymize PII on the profile but keep the row (foreign keys still point here)
    UPDATE profiles SET
        full_name             = 'Archived User',
        email                 = 'archived_' || user_id_to_archive::text,
        avatar_url            = NULL,
        bio                   = NULL,
        phone_number          = NULL,
        phone_country_code    = NULL,
        postcode              = NULL,
        latitude              = NULL,
        longitude             = NULL,
        company_name          = NULL,
        iban                  = NULL,
        paypal_email          = NULL,
        profile_slug          = NULL,
        skills                = NULL,
        services_offered      = NULL,
        professional_offerings = NULL,
        qualifications        = NULL,
        professions           = NULL,
        languages             = NULL,
        hourly_rate           = NULL,
        badges                = NULL,
        is_featured           = false,
        is_paused             = true,
        paused_reason         = 'Archived by admin',
        archived_at           = NOW(),
        updated_at            = NOW()
    WHERE id = user_id_to_archive;

    -- Remove the auth row so the person can never log in again
    DELETE FROM auth.users WHERE id = user_id_to_archive;

    RETURN json_build_object(
        'success', true,
        'message', 'User archived – PII removed, login disabled, all data preserved for audit.',
        'preserved_items', json_build_object(
            'tasks',    task_count,
            'bids',     bid_count,
            'messages', message_count,
            'reviews',  review_count
        )
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.safe_archive_user(UUID) TO authenticated;
