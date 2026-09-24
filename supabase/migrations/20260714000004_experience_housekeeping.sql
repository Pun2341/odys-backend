-- Housekeeping: missing updated_at triggers, and real photo URLs.

-- Both tables have an updated_at column but nothing was maintaining it.
CREATE TRIGGER experiences_updated_at
  BEFORE UPDATE ON experiences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cover images were seeded as 'gradient:linear-gradient(...)' placeholders,
-- which no <img> can render. Point them at real photos until hosts upload their
-- own into the experience-images storage bucket.
UPDATE experience_attachment SET file_url =
  'https://images.unsplash.com/photo-1565193298357-c5b46b0dbfd5?w=1200&q=80&auto=format&fit=crop'
  WHERE experience_id = 'eeee0001-0001-4001-8001-000000000001' AND is_cover;
UPDATE experience_attachment SET file_url =
  'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=1200&q=80&auto=format&fit=crop'
  WHERE experience_id = 'eeee0001-0001-4001-8001-000000000002' AND is_cover;
UPDATE experience_attachment SET file_url =
  'https://images.unsplash.com/photo-1591291621164-2c6367723315?w=1200&q=80&auto=format&fit=crop'
  WHERE experience_id = 'eeee0001-0001-4001-8001-000000000003' AND is_cover;
UPDATE experience_attachment SET file_url =
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=1200&q=80&auto=format&fit=crop'
  WHERE experience_id = 'eeee0001-0001-4001-8001-000000000004' AND is_cover;
UPDATE experience_attachment SET file_url =
  'https://images.unsplash.com/photo-1487070183336-b863922373d4?w=1200&q=80&auto=format&fit=crop'
  WHERE experience_id = 'eeee0001-0001-4001-8001-000000000005' AND is_cover;
UPDATE experience_attachment SET file_url =
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&q=80&auto=format&fit=crop'
  WHERE experience_id = 'eeee0001-0001-4001-8001-000000000006' AND is_cover;

-- Gallery shots (non-cover) so the detail carousel has more than one frame.
INSERT INTO experience_attachment (experience_id, attachment_type_code, file_url, is_cover)
SELECT e.id, 'image/jpeg', url, false
FROM experiences e
CROSS JOIN (VALUES
  ('https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200&q=80&auto=format&fit=crop'),
  ('https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=1200&q=80&auto=format&fit=crop'),
  ('https://images.unsplash.com/photo-1540206395-68808572332f?w=1200&q=80&auto=format&fit=crop'),
  ('https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?w=1200&q=80&auto=format&fit=crop')
) AS gallery(url)
WHERE e.experience_status_code = 'published' AND e.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Every seeded experience needs a duration for the slot list and the card meta;
-- only two of the six got one.
INSERT INTO experience_policy (experience_id, experience_policy_type_code, value, time_unit_code)
SELECT e.id, 'duration', 1, 'hour'
FROM experiences e
WHERE e.experience_status_code = 'published' AND e.deleted_at IS NULL
ON CONFLICT (experience_id, experience_policy_type_code) DO NOTHING;

INSERT INTO experience_policy (experience_id, experience_policy_type_code, value, time_unit_code)
SELECT e.id, 'cancellation_deadline', 24, 'hour'
FROM experiences e
WHERE e.experience_status_code = 'published' AND e.deleted_at IS NULL
ON CONFLICT (experience_id, experience_policy_type_code) DO NOTHING;
