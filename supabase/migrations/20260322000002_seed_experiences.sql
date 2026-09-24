-- Seed published experiences from prototype mock data (fixed UUIDs for stable deep links)

-- Locations
INSERT INTO locations (id, name, type, address) VALUES
  ('a0000001-0001-4001-8001-000000000001', 'Bangkok Studio', 'studio', 'Bangkok, Thailand'),
  ('a0000001-0001-4001-8001-000000000002', 'Pattaya Ranch', 'outdoor', 'Pattaya, Thailand')
ON CONFLICT (id) DO NOTHING;

-- Experiences
INSERT INTO experiences (
  id, title, short_description, full_description, category,
  min_spots, max_spots, has_hosted_before,
  host_experience_type_code, skill_level_code, activity_level_code,
  experience_status_code
) VALUES
  (
    'eeee0001-0001-4001-8001-000000000001',
    'Introduction to Pottery',
    'Learn wheel throwing basics in a cozy Bangkok studio.',
    'A hands-on introduction to pottery — shape clay, learn centering, and take home your first piece.',
    'Arts & Craft', 1, 10, true, 'informal', 'beginner', 'light', 'published'
  ),
  (
    'eeee0001-0001-4001-8001-000000000002',
    'Horseback Riding',
    'Trail ride along the coast near Pattaya.',
    'Guided horseback riding for beginners and intermediate riders along scenic coastal trails.',
    'Outdoor & Adventure', 1, 8, false, 'informal', 'beginner', 'moderate', 'published'
  ),
  (
    'eeee0001-0001-4001-8001-000000000003',
    'Sound Healing',
    'Meditation and sound bath for deep relaxation.',
    'Reconnect with yourself through calming sound healing designed to release stress and restore balance.',
    'Wellness', 1, 12, true, 'informal', 'no_skill_required', 'light', 'published'
  ),
  (
    'eeee0001-0001-4001-8001-000000000004',
    'Thai Cooking Class',
    'Cook authentic Thai dishes with a local chef.',
    'Market tour and hands-on cooking class — learn pad thai, green curry, and mango sticky rice.',
    'Food & Beverage', 2, 12, true, 'informal', 'beginner', 'light', 'published'
  ),
  (
    'eeee0001-0001-4001-8001-000000000005',
    'Flower Arrangement',
    'Create beautiful floral compositions.',
    'Learn ikebana-inspired techniques with seasonal Thai flowers in a mindful workshop.',
    'Arts & Craft', 1, 10, true, 'informal', 'beginner', 'light', 'published'
  ),
  (
    'eeee0001-0001-4001-8001-000000000006',
    'Self-Healing with John Doe',
    'Meditation and breath work session.',
    'Reconnect with yourself through a calming Self-Healing class designed to release stress, restore emotional balance, and deepen inner awareness.',
    'Wellness', 1, 10, true, 'informal', 'no_skill_required', 'light', 'published'
  )
ON CONFLICT (id) DO NOTHING;

-- Pricing (per person group rate)
INSERT INTO pricing (experience_id, pricing_model_type_code, min_participants, max_participants, pricing_type_code, price_amount, currency) VALUES
  ('eeee0001-0001-4001-8001-000000000001', 'group', 1, 10, 'per_person', 350, 'THB'),
  ('eeee0001-0001-4001-8001-000000000002', 'group', 1, 8, 'per_person', 400, 'THB'),
  ('eeee0001-0001-4001-8001-000000000003', 'group', 1, 12, 'per_person', 600, 'THB'),
  ('eeee0001-0001-4001-8001-000000000004', 'group', 2, 12, 'per_person', 500, 'THB'),
  ('eeee0001-0001-4001-8001-000000000005', 'group', 1, 10, 'per_person', 450, 'THB'),
  ('eeee0001-0001-4001-8001-000000000006', 'group', 1, 10, 'per_person', 350, 'THB')
ON CONFLICT DO NOTHING;

-- Private flat pricing (second row per experience where applicable)
INSERT INTO pricing (experience_id, pricing_model_type_code, min_participants, max_participants, pricing_type_code, price_amount, currency, is_active) VALUES
  ('eeee0001-0001-4001-8001-000000000006', 'individual', 1, 10, 'flat', 13000, 'THB', true)
ON CONFLICT DO NOTHING;

-- Location models
INSERT INTO location_model (id, location_id, type_code, owner_type_code, owner_id) VALUES
  ('b0000001-0001-4001-8001-000000000001', 'a0000001-0001-4001-8001-000000000001', 'fixed', 'experience', 'eeee0001-0001-4001-8001-000000000001'),
  ('b0000001-0001-4001-8001-000000000002', 'a0000001-0001-4001-8001-000000000002', 'fixed', 'experience', 'eeee0001-0001-4001-8001-000000000002'),
  ('b0000001-0001-4001-8001-000000000003', 'a0000001-0001-4001-8001-000000000001', 'fixed', 'experience', 'eeee0001-0001-4001-8001-000000000003'),
  ('b0000001-0001-4001-8001-000000000004', 'a0000001-0001-4001-8001-000000000001', 'fixed', 'experience', 'eeee0001-0001-4001-8001-000000000004'),
  ('b0000001-0001-4001-8001-000000000005', 'a0000001-0001-4001-8001-000000000001', 'fixed', 'experience', 'eeee0001-0001-4001-8001-000000000005'),
  ('b0000001-0001-4001-8001-000000000006', 'a0000001-0001-4001-8001-000000000001', 'fixed', 'experience', 'eeee0001-0001-4001-8001-000000000006')
ON CONFLICT (id) DO NOTHING;

-- Tags
INSERT INTO experience_tag (experience_id, tag_code) VALUES
  ('eeee0001-0001-4001-8001-000000000001', 'Creative'),
  ('eeee0001-0001-4001-8001-000000000001', 'Hands-on'),
  ('eeee0001-0001-4001-8001-000000000002', 'Outdoor'),
  ('eeee0001-0001-4001-8001-000000000003', 'Creative'),
  ('eeee0001-0001-4001-8001-000000000004', 'Creative'),
  ('eeee0001-0001-4001-8001-000000000006', 'Creative'),
  ('eeee0001-0001-4001-8001-000000000006', 'Women Founder')
ON CONFLICT DO NOTHING;

-- Cover images (CSS gradient placeholders until Storage URLs are uploaded)
INSERT INTO experience_attachment (experience_id, attachment_type_code, file_url, is_cover) VALUES
  ('eeee0001-0001-4001-8001-000000000001', 'image/jpeg', 'gradient:linear-gradient(135deg, #D4A574 0%, #8B5E3C 100%)', true),
  ('eeee0001-0001-4001-8001-000000000002', 'image/jpeg', 'gradient:linear-gradient(135deg, #C8956D 0%, #6B4423 100%)', true),
  ('eeee0001-0001-4001-8001-000000000003', 'image/jpeg', 'gradient:linear-gradient(135deg, #E8B896 0%, #A8724B 100%)', true),
  ('eeee0001-0001-4001-8001-000000000004', 'image/jpeg', 'gradient:linear-gradient(135deg, #E6C88E 0%, #A8803C 100%)', true),
  ('eeee0001-0001-4001-8001-000000000005', 'image/jpeg', 'gradient:linear-gradient(135deg, #E8C5C7 0%, #A8726B 100%)', true),
  ('eeee0001-0001-4001-8001-000000000006', 'image/jpeg', 'gradient:linear-gradient(135deg, #A8B89C 0%, #5C7566 100%)', true)
ON CONFLICT DO NOTHING;

-- Policies: 1 hour duration, 24h cancellation
INSERT INTO experience_policy (experience_id, experience_policy_type_code, value, time_unit_code) VALUES
  ('eeee0001-0001-4001-8001-000000000001', 'duration', 1, 'hour'),
  ('eeee0001-0001-4001-8001-000000000001', 'cancellation_deadline', 24, 'hour'),
  ('eeee0001-0001-4001-8001-000000000006', 'duration', 2, 'hour'),
  ('eeee0001-0001-4001-8001-000000000006', 'cancellation_deadline', 24, 'hour')
ON CONFLICT (experience_id, experience_policy_type_code) DO NOTHING;

-- Slots are generated by 20260326000000_refresh_experience_slots.sql, which owns
-- the rolling window and is safe to re-run once seeded slots age out. Do not
-- duplicate the generation here.
