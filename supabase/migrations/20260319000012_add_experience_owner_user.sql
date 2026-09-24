ALTER TABLE experiences
ADD COLUMN IF NOT EXISTS owner_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_experiences_owner_user_id
ON experiences(owner_user_id);
