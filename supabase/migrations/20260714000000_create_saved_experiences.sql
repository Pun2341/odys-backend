-- Wishlist / hearted experiences. Backs the heart button on cards and the
-- "Saved" section of the customer profile.

CREATE TABLE saved_experiences (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  experience_id uuid NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, experience_id)
);

CREATE INDEX idx_saved_experiences_user ON saved_experiences(user_id, created_at DESC);

ALTER TABLE saved_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_experiences_select_own" ON saved_experiences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saved_experiences_insert_own" ON saved_experiences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_experiences_delete_own" ON saved_experiences
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON saved_experiences TO authenticated;
