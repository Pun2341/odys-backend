import type { FastifyInstance } from 'fastify';
import { paginationSchema } from '../../lib/pagination.js';
import { listReviews } from '../reviews/service.js';
import { groupByDay, listSlots } from '../slots/service.js';
import { idParam, listExperiencesQuery, slotsQuery } from './schemas.js';
import {
  getExperience,
  getHomeFeed,
  getSummaryRow,
  listByHost,
  listExperiences,
  listSimilar,
} from './service.js';

export default async function experienceRoutes(app: FastifyInstance) {
  app.get('/experiences', async (request) => {
    const params = listExperiencesQuery.parse(request.query);
    return listExperiences(request.db, params);
  });

  // Declared before /experiences/:id so 'home' is not parsed as a uuid.
  app.get('/experiences/home', async (request) => getHomeFeed(request.db));

  app.get('/experiences/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    return getExperience(request.db, id);
  });

  app.get('/experiences/:id/slots', async (request) => {
    const { id } = idParam.parse(request.params);
    const query = slotsQuery.parse(request.query);

    const slots = await listSlots(request.db, id, query);
    const days = groupByDay(slots);

    return {
      slots,
      days,
      /** YYYY-MM-DD strings with at least one bookable slot — drives the calendar dots. */
      availableDates: days.filter((d) => d.slots.some((s) => !s.isSoldOut)).map((d) => d.date),
    };
  });

  app.get('/experiences/:id/reviews', async (request) => {
    const { id } = idParam.parse(request.params);
    const { limit, cursor } = paginationSchema.parse(request.query);
    return listReviews(request.db, id, { limit, cursor });
  });

  app.get('/experiences/:id/similar', async (request) => {
    const { id } = idParam.parse(request.params);
    return { items: await listSimilar(request.db, id) };
  });

  app.get('/experiences/:id/more-from-host', async (request) => {
    const { id } = idParam.parse(request.params);
    const row = await getSummaryRow(request.db, id);
    if (!row.owner_user_id) return { items: [] };
    return { items: await listByHost(request.db, row.owner_user_id, id) };
  });
}
