-- Per-experience editorial content.
--
-- Until now the detail screen rendered one shared literal
-- (odys-customer/src/data/detailContent.js) for every listing, so the pottery
-- class showed the meditation teacher's copy. These tables move that content
-- onto the experience it belongs to.
--
-- The list-shaped blocks are jsonb arrays of strings rather than six child
-- tables: they are always read and written whole, and never queried across.

CREATE TABLE experience_content (
  experience_id uuid PRIMARY KEY REFERENCES experiences(id) ON DELETE CASCADE,
  about text,
  quick_facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  included jsonb NOT NULL DEFAULT '[]'::jsonb,
  what_to_bring jsonb NOT NULL DEFAULT '[]'::jsonb,
  good_to_know jsonb NOT NULL DEFAULT '[]'::jsonb,
  meeting_point text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_quick_facts_array CHECK (jsonb_typeof(quick_facts) = 'array'),
  CONSTRAINT chk_steps_array CHECK (jsonb_typeof(steps) = 'array'),
  CONSTRAINT chk_included_array CHECK (jsonb_typeof(included) = 'array'),
  CONSTRAINT chk_what_to_bring_array CHECK (jsonb_typeof(what_to_bring) = 'array'),
  CONSTRAINT chk_good_to_know_array CHECK (jsonb_typeof(good_to_know) = 'array')
);

CREATE TRIGGER experience_content_updated_at
  BEFORE UPDATE ON experience_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE experience_faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_experience_faq_experience ON experience_faq(experience_id, sort_order);

-- Public catalogue content, same posture as experiences/tags/pricing.
ALTER TABLE experience_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "experience_content_select_public" ON experience_content
  FOR SELECT USING (true);
CREATE POLICY "experience_faq_select_public" ON experience_faq
  FOR SELECT USING (true);

GRANT SELECT ON experience_content TO anon, authenticated;
GRANT SELECT ON experience_faq TO anon, authenticated;
