import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';
import { env } from './env.js';
import authPlugin from './plugins/auth.js';
import corsPlugin from './plugins/cors.js';
import errorsPlugin from './plugins/errors.js';
import supabasePlugin from './plugins/supabase.js';
import bookingRoutes from './modules/bookings/routes.js';
import catalogRoutes from './modules/catalog/routes.js';
import experienceRoutes from './modules/experiences/routes.js';
import meRoutes from './modules/profile/routes.js';

export const API_PREFIX = '/v1';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
        : {}),
    },
    // A trailing slash shouldn't 404 a client.
    routerOptions: { ignoreTrailingSlash: true },
  });

  await app.register(sensible);
  await app.register(errorsPlugin);
  await app.register(corsPlugin);
  await app.register(supabasePlugin);
  await app.register(authPlugin);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(
    async (api) => {
      api.get('/health', async () => ({
        status: 'ok',
        env: env.NODE_ENV,
        time: new Date().toISOString(),
      }));

      await api.register(catalogRoutes);
      await api.register(experienceRoutes);
      await api.register(bookingRoutes);
      await api.register(meRoutes);
    },
    { prefix: API_PREFIX },
  );

  return app;
}
