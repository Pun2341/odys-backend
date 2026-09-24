import { SERVICE_FEE_RATE, toThb } from '../../lib/money.js';
import type { Db } from '../../plugins/supabase.js';

/**
 * Filter options for the results sheet.
 *
 * Categories and tags come from the catalogue itself rather than a hardcoded
 * list. The prototype shipped fixed option arrays that were substring-matched
 * against the listing text, so most categories matched nothing — deriving them
 * from real data means every option returns at least one result.
 */
export async function getFilters(db: Db) {
  const [categories, tags, languages, prices, durations] = await Promise.all([
    db.from('experience_summary').select('category'),
    db.from('experience_summary').select('tag_codes'),
    db.from('languages').select('code, name').order('name'),
    db.from('experience_summary').select('price_amount'),
    db.from('experience_summary').select('duration_minutes'),
  ]);

  const categoryList = [
    ...new Set(((categories.data ?? []) as { category: string | null }[]).map((r) => r.category).filter((c): c is string => !!c)),
  ].sort();

  const tagList = [
    ...new Set(((tags.data ?? []) as { tag_codes: string[] | null }[]).flatMap((r) => r.tag_codes ?? [])),
  ].sort();

  const priceValues = ((prices.data ?? []) as { price_amount: string | number | null }[])
    .map((r) => toThb(r.price_amount))
    .filter((n) => n > 0);

  const durationValues = ((durations.data ?? []) as { duration_minutes: number | null }[])
    .map((r) => r.duration_minutes)
    .filter((n): n is number => n !== null);

  // Round the slider bounds out to a round number so the handles sit sensibly.
  const priceMin = 0;
  const priceMax = priceValues.length ? Math.ceil(Math.max(...priceValues) / 500) * 500 : 10000;

  return {
    categories: categoryList,
    tags: tagList,
    languages: (languages.data ?? []) as { code: string; name: string }[],
    durations: [
      { key: 'd30', label: '30 mins', maxMinutes: 30 },
      { key: 'd60', label: '1 hour', maxMinutes: 60 },
      { key: 'd120', label: '2 hours', maxMinutes: 120 },
      { key: 'd180', label: '3 hours', maxMinutes: 180 },
      { key: 'd240', label: '4 hours', maxMinutes: 240 },
      { key: 'd5p', label: '5+ hours', maxMinutes: 9999 },
    ].filter((d, i, arr) =>
      // Hide buckets nothing can fall into, but always keep the last one.
      i === arr.length - 1 || durationValues.some((m) => m <= d.maxMinutes),
    ),
    ratings: [
      { value: 0, label: 'Any' },
      { value: 4, label: '4+ ★' },
      { value: 4.5, label: '4.5+ ★' },
      { value: 4.8, label: '4.8+ ★' },
    ],
    price: { min: priceMin, max: priceMax, step: 50, currency: 'THB' },
    sorts: [
      { value: 'recommended', label: 'Recommended' },
      { value: 'rating', label: 'Top rated' },
      { value: 'price_asc', label: 'Price: low to high' },
      { value: 'price_desc', label: 'Price: high to low' },
      { value: 'newest', label: 'Newest' },
    ],
    serviceFeeRate: SERVICE_FEE_RATE,
  };
}

/**
 * Editorial content for the Home, Search and Explore screens.
 *
 * Hand-curated and served from here rather than a table: it is copy, it changes
 * on a marketing cadence rather than a user one, and keeping it behind the API
 * means the frontends have exactly one data source. Give it a table when someone
 * other than an engineer needs to edit it.
 */
export function getDiscovery() {
  return {
    collections: [
      { query: 'Weekend escapes', title: 'Weekend escapes from Bangkok', subtitle: 'Out of the city', imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80' },
      { query: '', title: 'Under THB 500', subtitle: 'Easy on the wallet', imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&q=80', filters: { maxPrice: 500 } },
      { query: '', title: 'Rainy day picks', subtitle: 'Stay dry', imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80', filters: { categories: ['Arts & Craft'] } },
      { query: '', title: 'Solo & quiet', subtitle: 'Time to yourself', imageUrl: 'https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?w=400&q=80', filters: { categories: ['Wellness'] } },
      { query: '', title: 'First-date energy', subtitle: 'Something to do together', imageUrl: 'https://images.unsplash.com/photo-1591291621164-2c6367723315?w=400&q=80', filters: { categories: ['Food & Beverage'] } },
    ],
    destinations: [
      { name: 'Bangkok', imageUrl: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=200&q=80' },
      { name: 'Chiang Mai', imageUrl: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=200&q=80' },
      { name: 'Phuket', imageUrl: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=200&q=80' },
      { name: 'Krabi', imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=200&q=80' },
      { name: 'Khao Yai', imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=200&q=80' },
      { name: 'Pattaya', imageUrl: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=200&q=80' },
    ],
    trendingSearches: [
      { label: 'Pottery workshops', query: 'Pottery', imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80' },
      { label: 'Sound healing', query: 'Sound', imageUrl: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=400&q=80' },
      { label: 'Local food tours', query: 'Cooking', imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&q=80' },
      { label: 'Outdoor rides', query: 'Horseback', imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&q=80' },
    ],
    /**
     * Explore quick chips. Each carries the filter it applies, so the client no
     * longer needs its own tag-to-chip predicate map.
     */
    quickChips: [
      { key: 'all', label: 'All', filters: {} },
      { key: 'create', label: '🎨 Get creative', filters: { categories: ['Arts & Craft'] } },
      { key: 'wellness', label: '🌿 Wellness', filters: { categories: ['Wellness'] } },
      { key: 'outdoors', label: '🏞️ Outdoors', filters: { categories: ['Outdoor & Adventure'] } },
      { key: 'food', label: '🍷 Food & drink', filters: { categories: ['Food & Beverage'] } },
      { key: 'handson', label: '🤲 Hands-on', filters: { tags: ['Hands-on'] } },
    ],
  };
}
