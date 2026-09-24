-- =====================
-- Tags master table
-- =====================
CREATE TABLE tags (
  code varchar PRIMARY KEY,
  name varchar NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_tags_code UNIQUE (code)
);

-- ============================
-- Experience ↔ Tag join table
-- ============================
CREATE TABLE experience_tag (
  experience_id uuid NOT NULL,
  tag_code varchar NOT NULL,

  CONSTRAINT pk_experience_tag
    PRIMARY KEY (experience_id, tag_code),

  CONSTRAINT fk_experience_tag_experience
    FOREIGN KEY (experience_id)
    REFERENCES experiences(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_experience_tag_tag
    FOREIGN KEY (tag_code)
    REFERENCES tags(code)
    ON DELETE CASCADE
);

-- Index for tag-based search
CREATE INDEX idx_experience_tag_tag
  ON experience_tag(tag_code);