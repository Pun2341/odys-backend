import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { unwrap } from '../../plugins/errors.js';
import { validatePromo } from '../promos/service.js';
import {
  bookingIdParam,
  bookingRequestBody,
  createBookingBody,
  listBookingsQuery,
  quoteQuery,
  rescheduleBookingBody,
} from './schemas.js';
import {
  cancelBooking,
  createBooking,
  getBooking,
  listBookings,
  quote,
  rescheduleBooking,
} from './service.js';

export default async function bookingRoutes(app: FastifyInstance) {
  app.get('/me/bookings', async (request) => {
    const user = request.requireUser();
    const { status } = listBookingsQuery.parse(request.query);
    return listBookings(request.db, user.id, status);
  });

  app.get('/bookings/:id', async (request) => {
    const user = request.requireUser();
    const { id } = bookingIdParam.parse(request.params);
    return getBooking(request.db, user.id, id);
  });

  /** Price a prospective booking without creating one — drives the checkout total. */
  app.get('/bookings/quote', async (request) => {
    const params = quoteQuery.parse(request.query);
    return quote(request.db, params.slotId, params.guests, params.promoCode);
  });

  app.post('/bookings', async (request, reply) => {
    const user = request.requireUser();
    const body = createBookingBody.parse(request.body);
    const booking = await createBooking(request.db, user.id, body);
    return reply.status(201).send(booking);
  });

  app.patch('/bookings/:id', async (request) => {
    const user = request.requireUser();
    const { id } = bookingIdParam.parse(request.params);
    const body = rescheduleBookingBody.parse(request.body);
    return rescheduleBooking(request.db, user.id, id, body);
  });

  app.post('/bookings/:id/cancel', async (request) => {
    const user = request.requireUser();
    const { id } = bookingIdParam.parse(request.params);
    return cancelBooking(request.db, user.id, id);
  });

  app.post('/promos/validate', async (request) => {
    const body = z
      .object({ code: z.string().trim().max(50), subtotalThb: z.coerce.number().min(0) })
      .parse(request.body);
    return validatePromo(request.db, body.code, body.subtotalThb);
  });

  /** "Request availability" for experiences that allow it. */
  app.post('/booking-requests', async (request, reply) => {
    const user = request.requireUser();
    const body = bookingRequestBody.parse(request.body);

    const data = unwrap(
      await request.db
        .from('booking_requests')
        .insert({
          user_id: user.id,
          experience_id: body.experienceId,
          event_type: body.eventType,
          date_from: body.dateFrom ?? null,
          date_to: body.dateTo ?? null,
          preferred_time: body.preferredTime ?? null,
          location: body.location ?? null,
          attendees: body.attendees ?? null,
          notes: body.notes ?? null,
        })
        .select('*')
        .single(),
    );

    return reply.status(201).send(data);
  });
}
