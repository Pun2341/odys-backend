CREATE TABLE experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  title varchar NOT NULL,
  short_description varchar,
  full_description varchar,

  category varchar,

  min_spots int CHECK (min_spots >= 0),
  max_spots int CHECK (max_spots >= min_spots),

  has_hosted_before boolean NOT NULL DEFAULT false,

  host_experience_type_code varchar NOT NULL,
  practice_period_code varchar,
  skill_level_code varchar,
  activity_level_code varchar,

  min_age int CHECK (min_age >= 0),

  additional_requirement varchar,
  guest_preparation varchar,

  allow_request_for_availability boolean NOT NULL DEFAULT false,
  detail_request_for_availability varchar,

  experience_status_code varchar NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT fk_experience_status
    FOREIGN KEY (experience_status_code)
    REFERENCES experience_status(code),

  CONSTRAINT fk_host_experience_type
    FOREIGN KEY (host_experience_type_code)
    REFERENCES host_experience_type(code),

  CONSTRAINT fk_practice_period
    FOREIGN KEY (practice_period_code)
    REFERENCES practice_period(code),

  CONSTRAINT fk_activity_level
    FOREIGN KEY (activity_level_code)
    REFERENCES activity_level(code),

  CONSTRAINT fk_skill_level
    FOREIGN KEY (skill_level_code)
    REFERENCES skill_level(code)
);

-- Indexes
CREATE INDEX idx_experiences_status ON experiences(experience_status_code);
CREATE INDEX idx_experiences_deleted_at ON experiences(deleted_at);