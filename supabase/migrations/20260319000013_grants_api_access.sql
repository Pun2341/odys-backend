-- PostgREST access for catalog / lookup tables (read-only via anon + authenticated).
-- Scoped to the tables that exist at this point in the migration order: profiles
-- plus the catalog/lookup tables. Tables created by later migrations (bookings,
-- reflections, user_stamps, ...) carry their own explicit grants, deliberately --
-- do NOT reintroduce `alter default privileges ... to anon`, which would silently
-- expose every future table to anonymous reads.
grant usage on schema public to anon, authenticated;

grant select on all tables in schema public to anon, authenticated;
