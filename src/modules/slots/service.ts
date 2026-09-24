import { ApiError } from '../../lib/errors.js';
import { toThb } from '../../lib/money.js';
import { unwrap } from '../../plugins/errors.js';
import type { Db } from '../../plugins/supabase.js';
import type { SlotDayDto, SlotDto } from '../../types/dto.js';

/** Experiences are sold in Bangkok local time; the calendar groups days by it. */
export const VENUE_TZ = 'Asia/Bangkok';

export interface SlotRow {
  id: string;
  experience_id: string;
  starts_at: string;
  ends_at: string;
  mode: string;
  capacity: number;
  booked_count: number;
  price_amount: string | number;
  currency: string;
  status: string;
}

export function toSlot(row: SlotRow): SlotDto {
  const spotsLeft = Math.max(0, row.capacity - row.booked_count);
  return {
    id: row.id,
    experienceId: row.experience_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    mode: row.mode,
    capacity: row.capacity,
    bookedCount: row.booked_count,
    spotsLeft,
    isSoldOut: spotsLeft === 0 || row.status !== 'open',
    price: toThb(row.price_amount),
    currency: row.currency ?? 'THB',
    status: row.status,
  };
}

/** YYYY-MM-DD in the venue's timezone, not the server's. */
export function venueDay(isoTimestamp: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VENUE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(isoTimestamp));
}

export interface ListSlotsOptions {
  from?: string;
  to?: string;
  mode?: 'group' | 'private';
  /** Include slots that have already started. Default false. */
  includePast?: boolean;
}

export async function listSlots(
  db: Db,
  experienceId: string,
  options: ListSlotsOptions = {},
): Promise<SlotDto[]> {
  let query = db
    .from('experience_slots')
    .select('*')
    .eq('experience_id', experienceId)
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true });

  query = query.gte('starts_at', options.from ?? (options.includePast ? '1970-01-01' : new Date().toISOString()));
  if (options.to) query = query.lte('starts_at', options.to);
  if (options.mode) query = query.eq('mode', options.mode);

  const rows = (unwrap(await query) ?? []) as SlotRow[];
  return rows.map(toSlot);
}

export function groupByDay(slots: SlotDto[]): SlotDayDto[] {
  const days = new Map<string, SlotDto[]>();
  for (const slot of slots) {
    const key = venueDay(slot.startsAt);
    const bucket = days.get(key);
    if (bucket) bucket.push(slot);
    else days.set(key, [slot]);
  }
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daySlots]) => ({ date, slots: daySlots }));
}

export async function getSlot(db: Db, slotId: string): Promise<SlotRow> {
  const { data, error } = await db.from('experience_slots').select('*').eq('id', slotId).maybeSingle();
  if (error) unwrap({ data, error });
  if (!data) throw ApiError.notFound('That time slot no longer exists.');
  return data as SlotRow;
}
