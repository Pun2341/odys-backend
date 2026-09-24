-- =================================
-- Experience attachments
-- =================================
CREATE TABLE experience_attachment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  experience_id uuid NOT NULL,
  attachment_type_code varchar NOT NULL,

  file_url varchar NOT NULL,
  metadata_json jsonb,

  is_cover boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_experience_attachment_experience
    FOREIGN KEY (experience_id)
    REFERENCES experiences(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_experience_attachment_type
    FOREIGN KEY (attachment_type_code)
    REFERENCES attachment_type(code)
);

-- Only ONE cover per experience
CREATE UNIQUE INDEX uq_experience_cover
  ON experience_attachment (experience_id)
  WHERE is_cover = true;

-- Indexes
CREATE INDEX idx_experience_attachment_experience
  ON experience_attachment(experience_id);

CREATE INDEX idx_experience_attachment_type
  ON experience_attachment(attachment_type_code);