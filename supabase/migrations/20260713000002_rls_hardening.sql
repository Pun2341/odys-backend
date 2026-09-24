-- Host public profile view (avoids exposing phone / terms on profiles RLS).
CREATE OR REPLACE VIEW public.host_profiles
WITH (security_invoker = true) AS
  SELECT p.id, p.full_name, p.avatar_url, p.bio
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.experiences e WHERE e.owner_user_id = p.id
  );

GRANT SELECT ON public.host_profiles TO anon, authenticated;

-- Users can update their own booking requests.
CREATE POLICY "booking_requests_update_own"
  ON public.booking_requests
  FOR UPDATE
  USING (auth.uid() = user_id);
