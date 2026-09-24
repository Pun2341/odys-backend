import { z } from 'zod';

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Offset pagination. The cursor is an opaque-to-the-client stringified offset —
 * good enough for a catalogue this size, and swappable for a keyset cursor
 * without changing the response shape.
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  cursor: z.string().optional(),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  const n = Number.parseInt(cursor, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  total: number | null;
}

export function page<T>(items: T[], offset: number, limit: number, total: number | null): Page<T> {
  const consumed = offset + items.length;
  const hasMore = total === null ? items.length === limit : consumed < total;
  return {
    items,
    nextCursor: hasMore ? String(consumed) : null,
    total,
  };
}

/** Supabase `.range()` bounds are inclusive on both ends. */
export function rangeFor(offset: number, limit: number): [number, number] {
  return [offset, offset + limit - 1];
}
