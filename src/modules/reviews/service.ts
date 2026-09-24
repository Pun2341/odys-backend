import { decodeCursor, page, rangeFor, type Page } from '../../lib/pagination.js';
import { unwrap } from '../../plugins/errors.js';
import type { Db } from '../../plugins/supabase.js';
import type { ReviewDto } from '../../types/dto.js';

interface ReviewRow {
  id: string;
  rating: number;
  body: string;
  created_at: string;
  user_id: string;
  profiles: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

const toReview = (row: ReviewRow): ReviewDto => ({
  id: row.id,
  rating: row.rating,
  body: row.body,
  createdAt: row.created_at,
  author: row.profiles
    ? { id: row.profiles.id, fullName: row.profiles.full_name, avatarUrl: row.profiles.avatar_url }
    : null,
});

export async function listReviews(
  db: Db,
  experienceId: string,
  opts: { limit: number; cursor?: string },
): Promise<Page<ReviewDto>> {
  const offset = decodeCursor(opts.cursor);
  const [from, to] = rangeFor(offset, opts.limit);

  const result = await db
    .from('reviews')
    .select('id, rating, body, created_at, user_id, profiles(id, full_name, avatar_url)', {
      count: 'exact',
    })
    .eq('experience_id', experienceId)
    .order('created_at', { ascending: false })
    .range(from, to);

  const rows = (unwrap(result) ?? []) as unknown as ReviewRow[];
  return page(rows.map(toReview), offset, opts.limit, result.count ?? null);
}
