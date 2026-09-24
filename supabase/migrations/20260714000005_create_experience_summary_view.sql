-- A flat, queryable row per published experience.
--
-- Why a view: the API needs price, duration, rating, cover photo, host and
-- location on every card, and three of those are unreachable by PostgREST
-- embedding — location hangs off location_model.owner_id with NO foreign key,
-- rating is an aggregate over reviews, and price is the active pricing row.
-- Doing it here keeps listing a single indexed query instead of N+1 round trips,
-- and gives the API real columns to filter and sort on.
--
-- security_invoker = true so the caller's RLS still applies.

CREATE OR REPLACE VIEW public.experience_summary
WITH (security_invoker = true) AS
SELECT
  e.id,
  e.title,
  e.short_description,
  e.full_description,
  e.category,
  e.min_spots,
  e.max_spots,
  e.min_age,
  e.skill_level_code,
  e.activity_level_code,
  e.additional_requirement,
  e.guest_preparation,
  e.allow_request_for_availability,
  e.detail_request_for_availability,
  e.owner_user_id,
  e.created_at,

  host.full_name   AS host_name,
  host.avatar_url  AS host_avatar_url,
  host.bio         AS host_bio,

  loc.name              AS location_name,
  loc.address           AS location_address,
  loc.google_map_link   AS location_map_link,
  loc.direction_description AS location_directions,

  cover.file_url AS cover_image_url,

  price.price_amount      AS price_amount,
  price.currency          AS price_currency,
  price.pricing_type_code AS price_type,

  dur.minutes  AS duration_minutes,
  cancel.hours AS cancellation_deadline_hours,

  COALESCE(rv.avg_rating, 0)::numeric(3,2) AS rating,
  COALESCE(rv.review_count, 0)             AS review_count,

  COALESCE(tg.codes, ARRAY[]::varchar[]) AS tag_codes,

  -- Single column the API can ILIKE against for free-text search.
  lower(
    coalesce(e.title, '') || ' ' ||
    coalesce(e.short_description, '') || ' ' ||
    coalesce(e.full_description, '') || ' ' ||
    coalesce(e.category, '') || ' ' ||
    coalesce(loc.name, '') || ' ' ||
    coalesce(loc.address, '') || ' ' ||
    coalesce(array_to_string(tg.codes, ' '), '')
  ) AS search_text

FROM public.experiences e

LEFT JOIN public.profiles host
  ON host.id = e.owner_user_id

-- Experience -> location_model (polymorphic, unenforced) -> locations
LEFT JOIN LATERAL (
  SELECT lm.location_id
  FROM public.location_model lm
  WHERE lm.owner_type_code = 'experience'
    AND lm.owner_id = e.id
    AND lm.is_active
  ORDER BY lm.created_at
  LIMIT 1
) lm ON true
LEFT JOIN public.locations loc ON loc.id = lm.location_id

LEFT JOIN LATERAL (
  SELECT a.file_url
  FROM public.experience_attachment a
  WHERE a.experience_id = e.id AND a.is_cover
  LIMIT 1
) cover ON true

-- Cheapest active per-person rate is what a card advertises.
LEFT JOIN LATERAL (
  SELECT p.price_amount, p.currency, p.pricing_type_code
  FROM public.pricing p
  WHERE p.experience_id = e.id AND p.is_active
  ORDER BY (p.pricing_type_code = 'per_person') DESC, p.price_amount ASC
  LIMIT 1
) price ON true

LEFT JOIN LATERAL (
  SELECT (ep.value * CASE ep.time_unit_code
            WHEN 'minute' THEN 1 WHEN 'hour' THEN 60 WHEN 'day' THEN 1440 ELSE 1 END)::int AS minutes
  FROM public.experience_policy ep
  WHERE ep.experience_id = e.id AND ep.experience_policy_type_code = 'duration'
  LIMIT 1
) dur ON true

LEFT JOIN LATERAL (
  SELECT (ep.value * CASE ep.time_unit_code
            WHEN 'minute' THEN 1.0/60 WHEN 'hour' THEN 1 WHEN 'day' THEN 24 ELSE 1 END)::int AS hours
  FROM public.experience_policy ep
  WHERE ep.experience_id = e.id AND ep.experience_policy_type_code = 'cancellation_deadline'
  LIMIT 1
) cancel ON true

LEFT JOIN LATERAL (
  SELECT avg(r.rating)::numeric AS avg_rating, count(*)::int AS review_count
  FROM public.reviews r
  WHERE r.experience_id = e.id
) rv ON true

LEFT JOIN LATERAL (
  SELECT array_agg(et.tag_code ORDER BY et.tag_code)::varchar[] AS codes
  FROM public.experience_tag et
  WHERE et.experience_id = e.id
) tg ON true

WHERE e.experience_status_code = 'published'
  AND e.deleted_at IS NULL;

GRANT SELECT ON public.experience_summary TO anon, authenticated;

COMMENT ON VIEW public.experience_summary IS
  'Flattened published-experience catalogue: price, duration, rating, cover, host, location and a search_text column. Only published, non-deleted rows.';

-- Indexes supporting the view's hot paths.
CREATE INDEX IF NOT EXISTS idx_reviews_experience_rating ON public.reviews(experience_id, rating);
CREATE INDEX IF NOT EXISTS idx_pricing_experience_active ON public.pricing(experience_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_location_model_owner ON public.location_model(owner_id) WHERE owner_type_code = 'experience';
