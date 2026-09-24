import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { devAuthUserId } from '../env.js';
import { ApiError } from '../lib/errors.js';
import { admin, anon, clientForToken, type Db } from './supabase.js';

export interface AuthUser {
  id: string;
  email: string | null;
  /**
   * 'jwt'  — verified Supabase session; `db` enforces RLS.
   * 'dev'  — auth stub; `db` is the service-role client and RLS is BYPASSED,
   *          so services must filter by `user_id` themselves.
   */
  source: 'jwt' | 'dev';
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null;
    /** Scoped to the caller when signed in; the anon client otherwise. */
    db: Db;
    /** Throws 401 when there is no caller. Use in every /me and write route. */
    requireUser(): AuthUser;
  }
}

/**
 * Resolves the caller.
 *
 * Real path: `Authorization: Bearer <supabase access token>` is verified with
 * the Supabase Auth API, and `request.db` carries that token so Postgres RLS
 * decides what the user can touch.
 *
 * Stub path (development only): with no bearer token, the API acts as
 * DEV_AUTH_USER_ID. `request.db` is then the service-role client, which ignores
 * RLS — this is why services filter on `user_id` explicitly rather than relying
 * on policies. Deleting this branch is the whole of "turn on real auth".
 */
async function resolveUser(request: FastifyRequest): Promise<{ user: AuthUser | null; db: Db }> {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (token) {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) throw ApiError.unauthorized('Your session has expired.');
    return {
      user: { id: data.user.id, email: data.user.email ?? null, source: 'jwt' },
      db: clientForToken(token),
    };
  }

  if (devAuthUserId) {
    const { data } = await admin.auth.admin.getUserById(devAuthUserId);
    return {
      user: { id: devAuthUserId, email: data?.user?.email ?? null, source: 'dev' },
      db: admin,
    };
  }

  return { user: null, db: anon };
}

export default fp(async function authPlugin(app: FastifyInstance) {
  app.decorateRequest('user', null);
  app.decorateRequest('db', null as unknown as Db);
  app.decorateRequest('requireUser', function (this: FastifyRequest) {
    if (!this.user) {
      throw ApiError.unauthorized(
        devAuthUserId
          ? 'Sign in to continue.'
          : 'Sign in to continue. (No DEV_AUTH_USER_ID is set — run `npm run db:seed` and paste the demo customer id into .env.)',
      );
    }
    return this.user;
  });

  app.addHook('onRequest', async (request) => {
    const { user, db } = await resolveUser(request);
    request.user = user;
    request.db = db;
  });

  if (devAuthUserId) {
    app.log.warn(
      { devAuthUserId },
      'AUTH STUB ACTIVE — unauthenticated requests act as this user. Never enable in production.',
    );
  }
});
