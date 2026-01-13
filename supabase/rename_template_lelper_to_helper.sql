-- Rename email template from lelper_profile_reminder to helper_profile_reminder
-- This fixes the typo in the template name

UPDATE email_templates
SET template_type = 'helper_profile_reminder'
WHERE template_type = 'lelper_profile_reminder';

-- Verify the change
SELECT id, template_type, subject, created_at, updated_at
FROM email_templates
WHERE template_type = 'helper_profile_reminder';
