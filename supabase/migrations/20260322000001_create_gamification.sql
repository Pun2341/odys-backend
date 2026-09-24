-- Stamps and reflections (user gamification)

CREATE TABLE stamp_definitions (
  id text PRIMARY KEY,
  label text NOT NULL,
  emoji text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE user_stamps (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stamp_id text NOT NULL REFERENCES stamp_definitions(id) ON DELETE CASCADE,
  collected_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, stamp_id)
);

CREATE TABLE reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  experience_tag text,
  body text NOT NULL,
  reflection_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stamp_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stamp_definitions_select_all" ON stamp_definitions
  FOR SELECT USING (true);

CREATE POLICY "user_stamps_select_own" ON user_stamps
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_stamps_insert_own" ON user_stamps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reflections_select_own" ON reflections
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reflections_insert_own" ON reflections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reflections_update_own" ON reflections
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reflections_delete_own" ON reflections
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT ON stamp_definitions TO anon, authenticated;
GRANT SELECT, INSERT ON user_stamps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON reflections TO authenticated;

INSERT INTO stamp_definitions (id, label, emoji, sort_order) VALUES
  ('first_experience', 'First Experience', '🌱', 1),
  ('creativity', 'Creativity Check', '🎨', 2),
  ('new_location', 'New Location', '🎈', 3),
  ('wellness', 'Wellness Warrior', '🧘', 4),
  ('foodie', 'Food Explorer', '🍜', 5),
  ('outdoors', 'Outdoor Adventurer', '🏔️', 6),
  ('social', 'Social Butterfly', '🦋', 7),
  ('night_owl', 'Night Owl', '🌙', 8),
  ('early_bird', 'Early Bird', '🌅', 9),
  ('collector', 'Stamp Collector', '⭐', 10)
ON CONFLICT (id) DO NOTHING;
