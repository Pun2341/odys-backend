-- Allow public read of profiles linked as experience hosts (vendor pages).
-- host_profiles view + useVendor query depend on this for anon/authenticated callers.
CREATE POLICY "profiles_select_host_public"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.experiences e WHERE e.owner_user_id = profiles.id
    )
  );
