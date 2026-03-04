-- Seed email template: helper_task_match
-- This template is used for "New task near you" helper notifications.
-- It is safe to run multiple times thanks to ON CONFLICT on template_type.

INSERT INTO email_templates (template_type, subject, html_content)
VALUES (
  'helper_task_match',
  'New task near you: {{task_title}}',
  $HTML$
<div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:16px; border:1px solid #e5e7eb; border-radius:8px; background-color:#ffffff;">
  <h2 style="color:#2563eb; margin-top:0;">You have a new task match!</h2>
  <p style="font-size:16px; margin:8px 0;">
    A task near you on <strong>Taskorilla</strong> might be a perfect match:
  </p>
  
  <div style="background-color:#f3f4f6; padding:12px 16px; border-radius:8px; margin:16px 0;">
    <p style="margin:4px 0;"><strong>Task:</strong> {{task_title}}</p>
    <p style="margin:4px 0;"><strong>Amount:</strong> {{amount_label}}</p>
    <p style="margin:4px 0;"><strong>Location:</strong> {{location_label}}</p>
    <p style="margin:4px 0;"><strong>Distance:</strong> {{distance_label}}</p>
  </div>

  <a href="{{task_url}}"
     style="display:inline-block; background-color:#2563eb; color:white; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:bold;">
    View Task
  </a>

  <div style="margin-top:16px;">
    {{tee_image}}
  </div>

  <p style="margin-top:16px; font-size:12px; color:#6b7280;">
    You received this email because you are registered on Taskorilla. If you want to stop receiving these emails, you can change your
    <a href="https://www.taskorilla.com/profile" style="color:#2563eb; text-decoration:underline;">email preferences in your profile</a>.
  </p>
</div>
$HTML$
)
ON CONFLICT (template_type) DO UPDATE
SET
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  updated_at = TIMEZONE('utc', NOW());

