-- =========================
-- Location model
-- =========================
CREATE TABLE location_model (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL,
  type_code varchar NOT NULL,

  owner_type_code varchar NOT NULL,
  owner_id uuid NOT NULL,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_location_model_type
    FOREIGN KEY (type_code)
    REFERENCES location_model_types(code),

  CONSTRAINT fk_owner_type
    FOREIGN KEY (owner_type_code)
    REFERENCES owner_types(code)
);

CREATE INDEX idx_location_model_owner
  ON location_model(owner_type_code, owner_id);

-- =========================
-- Locations
-- =========================
CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name varchar,
  type varchar,

  address varchar,
  google_map_link varchar,
  direction_description varchar,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================
-- Amenity
-- =========================
CREATE TABLE amenity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  code varchar NOT NULL,
  name varchar NOT NULL,
  description varchar,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_amenity_code UNIQUE (code)
);

-- =========================
-- Location ↔ Amenity
-- =========================
CREATE TABLE location_amenity (
  location_id uuid NOT NULL,
  amenity_id uuid NOT NULL,

  CONSTRAINT pk_location_amenity
    PRIMARY KEY (location_id, amenity_id),

  CONSTRAINT fk_location_amenity_location
    FOREIGN KEY (location_id)
    REFERENCES locations(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_location_amenity_amenity
    FOREIGN KEY (amenity_id)
    REFERENCES amenity(id)
);