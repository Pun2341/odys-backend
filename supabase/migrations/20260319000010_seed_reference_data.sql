-- =========================
-- Experience status
-- =========================
INSERT INTO experience_status (code, name) VALUES
('draft', 'Draft'),
('submitted', 'Submitted'),
('approved', 'Approved'),
('rejected', 'Rejected'),
('archived', 'Archived'),
('published', 'Published')
ON CONFLICT (code) DO NOTHING;

-- =========================
-- Host experience types
-- =========================
INSERT INTO host_experience_type (code, name, description) VALUES
('platform', 'Platform-hosted', 'Hosted via another platform'),
('informal', 'Informal', 'Hosted independently by vendor')
ON CONFLICT (code) DO NOTHING;

-- =========================
-- Practice periods
-- =========================
INSERT INTO practice_period (code, name, sort_order) VALUES
('lt_1y', 'Less than a year', 1),
('1_2y', '1 - 2 Years', 2),
('3_5y', '3 - 5 Years', 3),
('6_9y', '6 - 9 Years', 4),
('10y_plus', '10+ years', 5)
ON CONFLICT (code) DO NOTHING;

-- =========================
-- Skill levels
-- =========================
INSERT INTO skill_level (code, name, sort_order) VALUES
('beginner', 'Beginner', 1),
('intermediate', 'Intermediate', 2),
('advanced', 'Advanced', 3),
('expert', 'Expert', 4),
('no_skill_required', 'No skill required', 5)
ON CONFLICT (code) DO NOTHING;

-- =========================
-- Activity levels
-- =========================
INSERT INTO activity_level (code, name, sort_order) VALUES
('light', 'Light', 1),
('moderate', 'Moderate', 2),
('extreme', 'Extreme', 3)
ON CONFLICT (code) DO NOTHING;

-- =========================
-- Policy types
-- =========================
INSERT INTO experience_policy_type (code, name) VALUES
('duration', 'Duration'),
('reservation_deadline', 'Reservation Deadline'),
('cancellation_deadline', 'Cancellation Deadline')
ON CONFLICT (code) DO NOTHING;

-- =========================
-- Time units
-- =========================
INSERT INTO time_unit (code, name) VALUES
('minute', 'Minute'),
('hour', 'Hour'),
('day', 'Day')
ON CONFLICT (code) DO NOTHING;

-- =========================
-- Experience language types
-- =========================
INSERT INTO experience_language_types (code, name) VALUES
('primary', 'Primary'),
('other', 'Other')
ON CONFLICT (code) DO NOTHING;

-- =========================
-- Location model types
-- =========================
INSERT INTO location_model_types (code, name) VALUES
('fixed', 'Fixed'),
('multiple', 'Multiple'),
('nomadic', 'Nomadic')
ON CONFLICT (code) DO NOTHING;

-- =========================
-- Attachment types
-- =========================
INSERT INTO attachment_type (code, mime_type) VALUES
('image/jpeg', 'image/jpeg'),
('image/png', 'image/png'),
('application/pdf', 'application/pdf')
ON CONFLICT (code) DO NOTHING;

-- =========================
-- Pricing model types
-- =========================
INSERT INTO pricing_model_types (code, name) VALUES
('individual', 'Individual'),
('group', 'Group')
ON CONFLICT (code) DO NOTHING;

-- =========================
-- Price types
-- =========================
INSERT INTO pricing_types (code, name) VALUES
('per_person', 'Per person'),
('flat', 'Flat price')
ON CONFLICT (code) DO NOTHING;

-- =========================
-- Owner types
-- =========================
INSERT INTO owner_types (code, name) VALUES
('experience', 'Experience'),
('event', 'Event')
ON CONFLICT (code) DO NOTHING;

-- =========================
-- Languages
-- =========================
INSERT INTO languages (code, name) VALUES
('en', 'English'),
('th', 'Thai'),
('ja', 'Japanese'),
('zh', 'Chinese')
ON CONFLICT (code) DO NOTHING;