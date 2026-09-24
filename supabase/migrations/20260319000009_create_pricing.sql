-- =========================
-- Pricing
-- =========================
CREATE TABLE pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL,

  pricing_model_type_code varchar NOT NULL,

  min_participants int NOT NULL CHECK (min_participants >= 1),
  max_participants int CHECK (max_participants >= min_participants),

  pricing_type_code varchar NOT NULL,
  price_amount decimal(10,2) NOT NULL CHECK (price_amount >= 0),
  currency varchar NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_pricing_experience
    FOREIGN KEY (experience_id)
    REFERENCES experiences(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_pricing_model_type
    FOREIGN KEY (pricing_model_type_code)
    REFERENCES pricing_model_types(code),

  CONSTRAINT fk_pricing_type
    FOREIGN KEY (pricing_type_code)
    REFERENCES pricing_types(code)
);

-- One active pricing row per (model, type, participant band). An experience
-- legitimately has several -- e.g. a group price and a private price -- so this
-- must NOT be keyed on experience_id alone.
CREATE UNIQUE INDEX uq_pricing_experience_details
  ON pricing (experience_id, pricing_model_type_code, pricing_type_code, min_participants, max_participants)
  WHERE is_active = true;

CREATE INDEX idx_pricing_model
  ON pricing(pricing_model_type_code);