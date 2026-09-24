import type { FastifyInstance } from 'fastify';
import { getDiscovery, getFilters } from './service.js';

export default async function catalogRoutes(app: FastifyInstance) {
  app.get('/catalog/filters', async (request) => getFilters(request.db));
  app.get('/catalog/discovery', async () => getDiscovery());
}
