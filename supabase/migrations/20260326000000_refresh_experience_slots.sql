-- Refresh experience slots with a rolling window (idempotent).
-- Safe to re-run when slots from the original seed have expired.

-- Remove past slots that have no active bookings
DELETE FROM experience_slots es
WHERE es.starts_at < now()
  AND NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.slot_id = es.id
      AND b.status NOT IN ('cancelled')
  );

-- Self-Healing (006): next 14 days, group + private at 10:00 Bangkok
INSERT INTO experience_slots (experience_id, starts_at, ends_at, mode, capacity, price_amount, currency)
SELECT
  'eeee0001-0001-4001-8001-000000000006',
  (CURRENT_DATE + d.day_offset + time '10:00') AT TIME ZONE 'Asia/Bangkok',
  (CURRENT_DATE + d.day_offset + time '12:00') AT TIME ZONE 'Asia/Bangkok',
  m.mode,
  10,
  CASE WHEN m.mode = 'private' THEN 13000 ELSE 350 END,
  'THB'
FROM generate_series(0, 13) AS d(day_offset)
CROSS JOIN (VALUES ('group'), ('private')) AS m(mode)
WHERE NOT EXISTS (
  SELECT 1 FROM experience_slots es
  WHERE es.experience_id = 'eeee0001-0001-4001-8001-000000000006'
    AND es.starts_at = (CURRENT_DATE + d.day_offset + time '10:00') AT TIME ZONE 'Asia/Bangkok'
    AND es.mode = m.mode
);

-- Other published experiences: 7 days, group only at 14:00
INSERT INTO experience_slots (experience_id, starts_at, ends_at, mode, capacity, price_amount, currency)
SELECT
  e.id,
  (CURRENT_DATE + d.day_offset + time '14:00') AT TIME ZONE 'Asia/Bangkok',
  (CURRENT_DATE + d.day_offset + time '15:00') AT TIME ZONE 'Asia/Bangkok',
  'group',
  10,
  pr.price_amount,
  'THB'
FROM experiences e
JOIN pricing pr ON pr.experience_id = e.id
  AND pr.pricing_model_type_code = 'group'
  AND pr.is_active = true
CROSS JOIN generate_series(0, 6) AS d(day_offset)
WHERE e.experience_status_code = 'published'
  AND e.id != 'eeee0001-0001-4001-8001-000000000006'
  AND NOT EXISTS (
    SELECT 1 FROM experience_slots es
    WHERE es.experience_id = e.id
      AND es.starts_at = (CURRENT_DATE + d.day_offset + time '14:00') AT TIME ZONE 'Asia/Bangkok'
      AND es.mode = 'group'
  );
