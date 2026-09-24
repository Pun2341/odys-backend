import { z } from 'zod';

export const createBookingBody = z.object({
  experienceId: z.string().uuid(),
  slotId: z.string().uuid(),
  guests: z.coerce.number().int().min(1).max(50).default(1),
  paymentMethodId: z.string().uuid().optional(),
  promoCode: z.string().trim().max(50).optional(),
  preparationNote: z.string().trim().max(2000).optional(),
});

export const rescheduleBookingBody = z.object({
  slotId: z.string().uuid(),
  guests: z.coerce.number().int().min(1).max(50).optional(),
});

export const listBookingsQuery = z.object({
  status: z.enum(['upcoming', 'past', 'cancelled', 'all']).default('all'),
});

export const bookingIdParam = z.object({ id: z.string().uuid('That is not a valid booking id.') });

export const quoteQuery = z.object({
  slotId: z.string().uuid(),
  guests: z.coerce.number().int().min(1).max(50).default(1),
  promoCode: z.string().trim().max(50).optional(),
});

export const bookingRequestBody = z.object({
  experienceId: z.string().uuid(),
  eventType: z.string().trim().min(1).max(100),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  preferredTime: z.string().trim().max(100).optional(),
  location: z.string().trim().max(200).optional(),
  attendees: z.coerce.number().int().min(1).max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
});
