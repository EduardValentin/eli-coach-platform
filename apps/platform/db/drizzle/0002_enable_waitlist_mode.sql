INSERT INTO app.feature_flags (name, enabled, description)
VALUES (
  'WAITLIST_MODE',
  true,
  'Controls pre-launch waitlist mode for the public landing page.'
)
ON CONFLICT (name) DO UPDATE
SET
  enabled = true,
  description = EXCLUDED.description,
  updated_at = now();
