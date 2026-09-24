import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import ws from 'ws';
import { env } from '../env.js';

export type Db = SupabaseClient;

/**
 * supabase-js constructs a Realtime client eagerly, and Realtime needs a
 * WebSocket implementation. Node 20 has no global WebSocket, so without this the
 * process throws at import time. This API never subscribes to Realtime — `ws` is
 * here purely to satisfy that constructor. It can go once Node 22 is the floor.
 */
const BASE: SupabaseClientOptions<'public'> = {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws as unknown as never },
};

/**
 * Service-role client. Bypasses RLS entirely, so every query made with it must
 * scope ownership itself (`.eq('user_id', user.id)`).
 */
export const admin: Db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, BASE);

/** Anon client — public catalogue reads, RLS applies as the `anon` role. */
export const anon: Db = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, BASE);

/** A client that acts as the signed-in user, so RLS enforces ownership for us. */
export function clientForToken(accessToken: string): Db {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    ...BASE,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    admin: Db;
    anon: Db;
  }
}

export default fp(async function supabasePlugin(app: FastifyInstance) {
  app.decorate('admin', admin);
  app.decorate('anon', anon);
});
