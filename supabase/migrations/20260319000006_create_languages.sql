-- =====================
-- Languages master
-- =====================
CREATE TABLE languages (
  code varchar PRIMARY KEY,
  name varchar NOT NULL,

  CONSTRAINT uq_languages_code UNIQUE (code)
);

-- ==================================
-- Experience ↔ Language association
-- ==================================
CREATE TABLE experience_language (
  experience_id uuid NOT NULL,
  language_code varchar NOT NULL,
  sort_order int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pk_experience_language
    PRIMARY KEY (experience_id, language_code),

  CONSTRAINT fk_experience_language_experience
    FOREIGN KEY (experience_id)
    REFERENCES experiences(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_experience_language_language
    FOREIGN KEY (language_code)
    REFERENCES languages(code)
);

-- Indexes
CREATE INDEX idx_experience_language_language
  ON experience_language(language_code);