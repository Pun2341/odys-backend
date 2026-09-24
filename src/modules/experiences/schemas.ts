import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination.js';

/** Repeated query params (?tags=a&tags=b) and CSV (?tags=a,b) both work. */
const list = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    const arr = Array.isArray(v) ? v : v.split(',');
    const cleaned = arr.map((s) => s.trim()).filter(Boolean);
    return cleaned.length ? cleaned : undefined;
  });

export const SORTS = ['recommended', 'rating', 'price_asc', 'price_desc', 'newest'] as const;
export type Sort = (typeof SORTS)[number];

export const listExperiencesQuery = paginationSchema.extend({
  q: z.string().trim().max(200).optional(),
  categories: list,
  tags: list,
  maxDurationMinutes: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(SORTS).default('recommended'),
});

export type ListExperiencesQuery = z.infer<typeof listExperiencesQuery>;

export const slotsQuery = z.object({
  from: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  to: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  mode: z.enum(['group', 'private']).optional(),
});

export const idParam = z.object({ id: z.string().uuid('That is not a valid experience id.') });
