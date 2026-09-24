import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '../env.js';

export default fp(async function corsPlugin(app: FastifyInstance) {
  const allowed = new Set(env.CORS_ORIGINS);

  await app.register(cors, {
    // A missing Origin (curl, server-to-server) is allowed; a present one must match.
    origin: (origin, cb) => cb(null, !origin || allowed.has(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
});
