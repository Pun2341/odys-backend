-- Enable RLS on catalog / lookup tables (public read via explicit SELECT policies).
-- Clears Supabase Security Advisor "RLS disabled in public" warnings.
-- No INSERT/UPDATE/DELETE policies — anon/authenticated stay read-only; service_role writes unchanged.

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'experiences',
    'experience_policy',
    'experience_attachment',
    'pricing',
    'tags',
    'experience_tag',
    'languages',
    'experience_language',
    'location_model',
    'locations',
    'amenity',
    'location_amenity',
    'experience_status',
    'host_experience_type',
    'practice_period',
    'activity_level',
    'skill_level',
    'time_unit',
    'experience_policy_type',
    'attachment_type',
    'experience_language_types',
    'location_model_types',
    'pricing_model_types',
    'pricing_types',
    'owner_types'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (true)',
      tbl || '_select_public',
      tbl
    );
  END LOOP;
END $$;
