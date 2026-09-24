import { toThb } from '../../lib/money.js';
import type {
  ExperienceContentDto,
  ExperienceDetailDto,
  ExperienceSummaryDto,
  LocationDto,
  ReviewSummaryDto,
} from '../../types/dto.js';

/** A row of public.experience_summary. */
export interface SummaryRow {
  id: string;
  title: string;
  short_description: string | null;
  full_description: string | null;
  category: string | null;
  min_spots: number | null;
  max_spots: number | null;
  min_age: number | null;
  skill_level_code: string | null;
  activity_level_code: string | null;
  additional_requirement: string | null;
  guest_preparation: string | null;
  allow_request_for_availability: boolean | null;
  owner_user_id: string | null;
  created_at: string;
  host_name: string | null;
  host_avatar_url: string | null;
  host_bio: string | null;
  location_name: string | null;
  location_address: string | null;
  location_map_link: string | null;
  location_directions: string | null;
  cover_image_url: string | null;
  price_amount: string | number | null;
  price_currency: string | null;
  price_type: string | null;
  duration_minutes: number | null;
  cancellation_deadline_hours: number | null;
  rating: string | number | null;
  review_count: number | null;
  tag_codes: string[] | null;
}

/**
 * Seeded covers were CSS gradient strings ('gradient:linear-gradient(...)').
 * 20260714000004 replaced the seeded ones, but a host could still save one, and
 * an <img src="gradient:..."> is a broken image — so drop anything that isn't a
 * URL rather than shipping it to the client.
 */
function imageUrl(value: string | null): string | null {
  if (!value) return null;
  return /^(https?:|\/)/i.test(value) ? value : null;
}

function toLocation(row: SummaryRow): LocationDto | null {
  if (!row.location_name && !row.location_address) return null;
  return {
    name: row.location_name,
    address: row.location_address,
    googleMapLink: row.location_map_link,
    directions: row.location_directions,
  };
}

export function toSummary(row: SummaryRow): ExperienceSummaryDto {
  const rating = row.rating === null ? null : Number(row.rating);
  const reviewCount = row.review_count ?? 0;

  return {
    id: row.id,
    title: row.title,
    shortDescription: row.short_description,
    category: row.category,
    tags: row.tag_codes ?? [],
    location: toLocation(row),
    durationMinutes: row.duration_minutes,
    price:
      row.price_amount === null
        ? null
        : {
            amount: toThb(row.price_amount),
            currency: row.price_currency ?? 'THB',
            type: row.price_type ?? 'per_person',
          },
    // A brand-new listing has no reviews; send null so the UI hides the stars
    // instead of advertising a 0.0 rating.
    //
    // One decimal place: the column is numeric(3,2), which would otherwise show
    // as "4.67" on a card while the detail page's reviewSummary rounds the same
    // value to "4.7".
    rating: reviewCount > 0 && rating !== null ? Math.round(rating * 10) / 10 : null,
    reviewCount,
    coverImageUrl: imageUrl(row.cover_image_url),
    host: row.owner_user_id
      ? { id: row.owner_user_id, fullName: row.host_name, avatarUrl: imageUrl(row.host_avatar_url) }
      : null,
  };
}

export interface ContentRow {
  about: string | null;
  quick_facts: unknown;
  steps: unknown;
  included: unknown;
  what_to_bring: unknown;
  good_to_know: unknown;
  meeting_point: string | null;
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

export function toContent(
  row: ContentRow | null,
  faqs: { question: string; answer: string }[],
): ExperienceContentDto {
  return {
    about: row?.about ?? null,
    quickFacts: strings(row?.quick_facts),
    steps: strings(row?.steps),
    included: strings(row?.included),
    whatToBring: strings(row?.what_to_bring),
    goodToKnow: strings(row?.good_to_know),
    meetingPoint: row?.meeting_point ?? null,
    faqs,
  };
}

export function toReviewSummary(ratings: number[]): ReviewSummaryDto {
  const breakdown: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  for (const r of ratings) {
    const key = String(r);
    if (key in breakdown) breakdown[key] = (breakdown[key] ?? 0) + 1;
  }
  const count = ratings.length;
  const average = count === 0 ? null : Math.round((ratings.reduce((a, b) => a + b, 0) / count) * 10) / 10;
  return { average, count, breakdown };
}

export interface DetailExtras {
  images: string[];
  languages: { code: string; name: string }[];
  amenities: { code: string; name: string }[];
  content: ExperienceContentDto;
  reviewSummary: ReviewSummaryDto;
}

export function toDetail(row: SummaryRow, extras: DetailExtras): ExperienceDetailDto {
  const summary = toSummary(row);
  return {
    ...summary,
    host: summary.host ? { ...summary.host, bio: row.host_bio } : null,
    fullDescription: row.full_description,
    minSpots: row.min_spots,
    maxSpots: row.max_spots,
    minAge: row.min_age,
    skillLevel: row.skill_level_code,
    activityLevel: row.activity_level_code,
    additionalRequirement: row.additional_requirement,
    guestPreparation: row.guest_preparation,
    allowRequestForAvailability: row.allow_request_for_availability ?? false,
    images: extras.images,
    languages: extras.languages,
    amenities: extras.amenities,
    policies: {
      durationMinutes: row.duration_minutes,
      cancellationDeadlineHours: row.cancellation_deadline_hours,
    },
    content: extras.content,
    reviewSummary: extras.reviewSummary,
  };
}

/** Columns the view exposes; used as the PostgREST select list. */
export const SUMMARY_COLUMNS = '*';
