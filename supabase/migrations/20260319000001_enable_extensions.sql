-- gen_random_uuid() for table defaults. On hosted Supabase pgcrypto already
-- lives in the extensions schema, so this is a no-op there; it matters for
-- `supabase start` / db reset against a bare Postgres.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
