CREATE TABLE experience_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  experience_id uuid NOT NULL,
  experience_policy_type_code varchar NOT NULL,

  value int NOT NULL CHECK (value >= 0),
  time_unit_code varchar NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_experience_policy_experience
    FOREIGN KEY (experience_id)
    REFERENCES experiences(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_experience_policy_type
    FOREIGN KEY (experience_policy_type_code)
    REFERENCES experience_policy_type(code),

  CONSTRAINT fk_experience_policy_unit
    FOREIGN KEY (time_unit_code)
    REFERENCES time_unit(code),

  -- Prevent duplicate policy types per experience
  CONSTRAINT uq_experience_policy_type_per_experience
    UNIQUE (experience_id, experience_policy_type_code)
);

-- Indexes
CREATE INDEX idx_experience_policy_experience
  ON experience_policy(experience_id);

CREATE INDEX idx_experience_policy_type
  ON experience_policy(experience_policy_type_code);