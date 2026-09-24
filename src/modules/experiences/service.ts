import { ApiError } from '../../lib/errors.js';
import { decodeCursor, page, rangeFor, type Page } from '../../lib/pagination.js';
import { unwrap } from '../../plugins/errors.js';
import type { Db } from '../../plugins/supabase.js';
import type { ExperienceDetailDto, ExperienceSummaryDto } from '../../types/dto.js';
import {
  toContent,
  toDetail,
  toReviewSummary,
  toSummary,
  type ContentRow,
  type SummaryRow,
} from './mappers.js';
import type { ListExperiencesQuery } from './schemas.js';

const VIEW = 'experience_summary';

interface Sortable {
  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): Sortable;
}

function applySort<T extends Sortable>(query: T, sort: ListExperiencesQuery['sort']): T {
  switch (sort) {
    case 'rating':
      return query.order('rating', { ascending: false }).order('review_count', { ascending: false }) as T;
    case 'price_asc':
      return query.order('price_amount', { ascending: true, nullsFirst: false }) as T;
    case 'price_desc':
      return query.order('price_amount', { ascending: false, nullsFirst: false }) as T;
    case 'newest':
      return query.order('created_at', { ascending: false }) as T;
    case 'recommended':
    default:
      // Well-reviewed first, then newest — a stable stand-in until there is
      // enough behavioural data to personalise.
      return query
        .order('review_count', { ascending: false })
        .order('rating', { ascending: false })
        .order('created_at', { ascending: false }) as T;
  }
}

export async function listExperiences(
  db: Db,
  params: ListExperiencesQuery,
): Promise<Page<ExperienceSummaryDto>> {
  const offset = decodeCursor(params.cursor);
  const [from, to] = rangeFor(offset, params.limit);

  let query = db.from(VIEW).select('*', { count: 'exact' });

  if (params.q) {
    // search_text is pre-lowercased by the view; escape PostgREST wildcards.
    const needle = params.q.toLowerCase().replace(/[%_,]/g, ' ').trim();
    if (needle) query = query.like('search_text', `%${needle}%`);
  }
  if (params.categories) query = query.in('category', params.categories);
  if (params.tags) query = query.overlaps('tag_codes', params.tags);
  if (params.maxDurationMinutes) query = query.lte('duration_minutes', params.maxDurationMinutes);
  if (params.minPrice !== undefined) query = query.gte('price_amount', params.minPrice);
  if (params.maxPrice !== undefined) query = query.lte('price_amount', params.maxPrice);
  if (params.minRating) query = query.gte('rating', params.minRating);

  const result = await applySort(query, params.sort).range(from, to);
  const rows = (unwrap(result) ?? []) as SummaryRow[];

  return page(rows.map(toSummary), offset, params.limit, result.count ?? null);
}

export async function getSummaryRow(db: Db, id: string): Promise<SummaryRow> {
  const { data, error } = await db.from(VIEW).select('*').eq('id', id).maybeSingle();
  if (error) unwrap({ data, error });
  if (!data) throw ApiError.notFound('We could not find that experience.');
  return data as SummaryRow;
}

export async function getExperience(db: Db, id: string): Promise<ExperienceDetailDto> {
  const row = await getSummaryRow(db, id);

  const [attachments, content, faqs, languages, amenities, ratings] = await Promise.all([
    db.from('experience_attachment').select('file_url, is_cover').eq('experience_id', id).order('is_cover', { ascending: false }),
    db.from('experience_content').select('*').eq('experience_id', id).maybeSingle(),
    db.from('experience_faq').select('question, answer').eq('experience_id', id).order('sort_order'),
    db.from('experience_language').select('language_code, languages(code, name)').eq('experience_id', id).order('sort_order'),
    listAmenities(db, id),
    db.from('reviews').select('rating').eq('experience_id', id),
  ]);

  const images = ((attachments.data ?? []) as { file_url: string }[])
    .map((a) => a.file_url)
    .filter((url) => /^(https?:|\/)/i.test(url));

  const languageRows = (languages.data ?? []) as unknown as {
    languages: { code: string; name: string } | null;
  }[];

  return toDetail(row, {
    images,
    languages: languageRows.map((l) => l.languages).filter((l): l is { code: string; name: string } => !!l),
    amenities,
    content: toContent(
      (content.data ?? null) as ContentRow | null,
      (faqs.data ?? []) as { question: string; answer: string }[],
    ),
    reviewSummary: toReviewSummary(((ratings.data ?? []) as { rating: number }[]).map((r) => r.rating)),
  });
}

/**
 * Amenities hang off the location, which is reachable only through
 * location_model.owner_id — an unenforced polymorphic link, so this is two hops
 * rather than an embed.
 */
async function listAmenities(db: Db, experienceId: string): Promise<{ code: string; name: string }[]> {
  const { data: models } = await db
    .from('location_model')
    .select('location_id')
    .eq('owner_type_code', 'experience')
    .eq('owner_id', experienceId)
    .limit(1);

  const locationId = (models as { location_id: string }[] | null)?.[0]?.location_id;
  if (!locationId) return [];

  const { data } = await db
    .from('location_amenity')
    .select('amenity(code, name)')
    .eq('location_id', locationId);

  return ((data ?? []) as unknown as { amenity: { code: string; name: string } | null }[])
    .map((r) => r.amenity)
    .filter((a): a is { code: string; name: string } => !!a);
}

/** Same category or overlapping tags, excluding the experience itself. */
export async function listSimilar(db: Db, id: string, limit = 6): Promise<ExperienceSummaryDto[]> {
  const row = await getSummaryRow(db, id);

  let query = db.from(VIEW).select('*').neq('id', id).limit(limit);
  const tags = row.tag_codes ?? [];

  if (row.category && tags.length) {
    // Values inside an `or` filter must be quoted: categories contain spaces and
    // '&' ("Arts & Craft"), and tags contain '-' ("Hands-on"), all of which
    // would otherwise be parsed as PostgREST syntax.
    const quote = (v: string) => `"${v.replace(/"/g, '\\"')}"`;
    query = query.or(
      `category.eq.${quote(row.category)},tag_codes.ov.{${tags.map(quote).join(',')}}`,
    );
  } else if (row.category) {
    query = query.eq('category', row.category);
  } else if (tags.length) {
    query = query.overlaps('tag_codes', tags);
  }

  const { data } = await query.order('review_count', { ascending: false });
  return ((data ?? []) as SummaryRow[]).map(toSummary);
}

/** Other published experiences by the same host. */
export async function listByHost(
  db: Db,
  hostId: string,
  excludeId?: string,
  limit = 6,
): Promise<ExperienceSummaryDto[]> {
  let query = db.from(VIEW).select('*').eq('owner_user_id', hostId).limit(limit);
  if (excludeId) query = query.neq('id', excludeId);
  const { data } = await query.order('created_at', { ascending: false });
  return ((data ?? []) as SummaryRow[]).map(toSummary);
}

export interface HomeFeed {
  forYou: ExperienceSummaryDto[];
  top: ExperienceSummaryDto[];
  trending: ExperienceSummaryDto[];
  featured: ExperienceSummaryDto | null;
}

/**
 * One request for the whole Home screen.
 *
 * The three rails are different orderings of one catalogue, which is only
 * legible while the catalogue is bigger than a rail. With a handful of
 * published experiences all three would otherwise show the same cards in the
 * same order, so:
 *
 *   - the featured pick is lifted out and excluded from the rails beneath it,
 *     rather than being repeated as the first card of "Top experiences";
 *   - each rail is capped at RAIL_SIZE and, when the catalogue is too small to
 *     fill three distinct rails, offset so they do not all start on the same
 *     card.
 *
 * Each rail gets its own real signal once there is usage data to sort on.
 */
const RAIL_SIZE = 6;

export async function getHomeFeed(db: Db): Promise<HomeFeed> {
  const [newest, byRating, byReviews] = await Promise.all([
    db.from(VIEW).select('*').order('created_at', { ascending: false }).limit(24),
    db.from(VIEW).select('*').order('rating', { ascending: false }).order('review_count', { ascending: false }).limit(24),
    db.from(VIEW).select('*').order('review_count', { ascending: false }).order('rating', { ascending: false }).limit(24),
  ]);

  const map = (r: { data: unknown }) => ((r.data ?? []) as SummaryRow[]).map(toSummary);

  const topRated = map(byRating);
  const featured = topRated[0] ?? null;

  const without = (list: ExperienceSummaryDto[]) =>
    featured ? list.filter((x) => x.id !== featured.id) : list;

  const top = without(topRated);
  const trending = without(map(byReviews));
  const forYou = without(map(newest));

  /**
   * Rotate a rail when there is not enough content for the orderings to differ
   * on their own, so the rails still read as three different shelves.
   */
  const stagger = (list: ExperienceSummaryDto[], offset: number) => {
    if (list.length === 0) return list;
    const shift = list.length > RAIL_SIZE ? 0 : offset % list.length;
    return [...list.slice(shift), ...list.slice(0, shift)].slice(0, RAIL_SIZE);
  };

  return {
    forYou: stagger(forYou, 0),
    top: stagger(top, 1),
    trending: stagger(trending, 2),
    featured,
  };
}
