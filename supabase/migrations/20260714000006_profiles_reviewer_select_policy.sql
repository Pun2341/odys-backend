-- Review author names.
--
-- profiles is readable only for yourself (profiles_select_own) or for hosts
-- (profiles_select_host_public), so a signed-in customer reading an experience's
-- reviews got NULL for every author and the UI showed anonymous reviews.
--
-- Anyone who has published a review has already published their name alongside
-- it, so expose the same minimal columns the host policy does.

CREATE POLICY "profiles_select_reviewer_public" ON public.profiles
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.reviews r WHERE r.user_id = profiles.id));

CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.reviews(user_id);
