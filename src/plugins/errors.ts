import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { env } from '../env.js';
import { ApiError, isApiError } from '../lib/errors.js';

/**
 * Every error leaves the API as `{ message, code, details? }` — the shape the
 * frontends' ApiError class reads.
 */
export default fp(async function errorsPlugin(app: FastifyInstance) {
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      message: `No route for ${request.method} ${request.url}`,
      code: 'route_not_found',
    });
  });

  app.setErrorHandler((error: unknown, request, reply) => {
    if (isApiError(error)) {
      return reply
        .status(error.status)
        .send({ message: error.message, code: error.code, details: error.details });
    }

    if (error instanceof ZodError) {
      const details = error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      return reply.status(400).send({
        message: 'Some of those values were not valid.',
        code: 'validation_failed',
        details,
      });
    }

    // Fastify's own validation / payload errors carry a statusCode.
    const fastifyError = error as { statusCode?: number; code?: string; message?: string };
    const status = typeof fastifyError.statusCode === 'number' ? fastifyError.statusCode : 500;
    const message = fastifyError.message ?? 'Unknown error';

    if (status < 500) {
      return reply.status(status).send({ message, code: fastifyError.code ?? 'bad_request' });
    }

    request.log.error({ err: error }, 'Unhandled error');
    return reply.status(500).send({
      message: 'Something went wrong on our end.',
      code: 'internal_error',
      ...(env.NODE_ENV === 'development' ? { details: message } : {}),
    });
  });
});

/**
 * Translate a PostgREST/Postgres error into an ApiError.
 *
 * The booking capacity triggers (`bookings_check_capacity` in
 * 20260322000004_booking_slot_triggers.sql) raise plain exceptions, which
 * surface as P0001. Mapping them here keeps a full slot a 409 rather than a 500.
 */
export function fromPostgrest(error: { code?: string; message?: string } | null): ApiError | null {
  if (!error) return null;
  const message = error.message ?? 'Database error';

  if (/not enough spots/i.test(message)) {
    return ApiError.conflict('slot_full', 'That time just filled up. Pick another slot.');
  }
  if (/slot not found/i.test(message)) {
    return ApiError.notFound('That time slot is no longer available.');
  }
  if (/slot does not belong to experience/i.test(message)) {
    return ApiError.badRequest('That time slot belongs to a different experience.');
  }

  switch (error.code) {
    case 'PGRST116': // .single() matched no rows
      return ApiError.notFound();
    case '23505':
      return ApiError.conflict('duplicate', 'That already exists.');
    case '23503':
      return ApiError.badRequest('That references something which does not exist.');
    case '23514':
      return ApiError.unprocessable('That value is out of the allowed range.');
    case '42501':
      return ApiError.forbidden();
    default:
      return null;
  }
}

/** Unwrap a Supabase `{ data, error }` result, or throw a mapped ApiError. */
export function unwrap<T>(result: { data: T; error: { code?: string; message?: string } | null }): T {
  if (result.error) {
    throw fromPostgrest(result.error) ?? new ApiError(500, 'database_error', result.error.message ?? 'Database error');
  }
  return result.data;
}
