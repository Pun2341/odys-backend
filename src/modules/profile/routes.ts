import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { listSaved, save, unsave } from '../saved/service.js';
import {
  createPaymentMethod,
  createPaymentMethodBody,
  deletePaymentMethod,
  listPaymentMethods,
  setDefaultPaymentMethod,
} from '../paymentMethods/service.js';
import { getProfile, updateEmail, updateProfileBody, updateProfile } from './service.js';

const experienceIdParam = z.object({ experienceId: z.string().uuid() });
const idParam = z.object({ id: z.string().uuid() });

export default async function meRoutes(app: FastifyInstance) {
  app.get('/me', async (request) => {
    const user = request.requireUser();
    return getProfile(request.db, user);
  });

  app.patch('/me', async (request) => {
    const user = request.requireUser();
    const body = updateProfileBody.extend({ email: z.string().email().optional() }).parse(request.body);

    // Email lives in auth.users, so it takes a different write path.
    if (body.email && body.email !== user.email) await updateEmail(user, body.email);

    return updateProfile(request.db, { ...user, email: body.email ?? user.email }, body);
  });

  app.get('/me/saved', async (request) => {
    const user = request.requireUser();
    return listSaved(request.db, user.id);
  });

  app.put('/me/saved/:experienceId', async (request) => {
    const user = request.requireUser();
    const { experienceId } = experienceIdParam.parse(request.params);
    await save(request.db, user.id, experienceId);
    return { saved: true, experienceId };
  });

  app.delete('/me/saved/:experienceId', async (request) => {
    const user = request.requireUser();
    const { experienceId } = experienceIdParam.parse(request.params);
    await unsave(request.db, user.id, experienceId);
    return { saved: false, experienceId };
  });

  app.get('/me/payment-methods', async (request) => {
    const user = request.requireUser();
    return { items: await listPaymentMethods(request.db, user.id) };
  });

  app.post('/me/payment-methods', async (request, reply) => {
    const user = request.requireUser();
    const body = createPaymentMethodBody.parse(request.body);
    return reply.status(201).send(await createPaymentMethod(request.db, user.id, body));
  });

  app.post('/me/payment-methods/:id/default', async (request) => {
    const user = request.requireUser();
    const { id } = idParam.parse(request.params);
    return setDefaultPaymentMethod(request.db, user.id, id);
  });

  app.delete('/me/payment-methods/:id', async (request, reply) => {
    const user = request.requireUser();
    const { id } = idParam.parse(request.params);
    await deletePaymentMethod(request.db, user.id, id);
    return reply.status(204).send();
  });
}
