-- Experience status
CREATE TABLE experience_status (
  code VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL
);

-- Host experience types
CREATE TABLE host_experience_type (
  code VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  description VARCHAR
);

-- Practice periods
CREATE TABLE practice_period (
  code VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  sort_order INT NOT NULL
);

-- Activity levels
CREATE TABLE activity_level (
  code VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  sort_order INT NOT NULL
);

-- Skill levels
CREATE TABLE skill_level (
  code VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  sort_order INT NOT NULL
);

-- Time units
CREATE TABLE time_unit (
  code VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL
);

-- Policy types
CREATE TABLE experience_policy_type (
  code VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL
);

-- Attachment types
CREATE TABLE attachment_type (
  code VARCHAR PRIMARY KEY,
  mime_type VARCHAR NOT NULL
);

-- Experience language types
CREATE TABLE experience_language_types (
  code VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL
);

-- Location model types
CREATE TABLE location_model_types (
  code VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL
);

-- Pricing model types
CREATE TABLE pricing_model_types (
  code VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL
);

-- Price types
CREATE TABLE pricing_types (
  code VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL
);

-- Owner types
CREATE TABLE owner_types (
  code VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL
);