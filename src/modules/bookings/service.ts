import { ApiError } from '../../lib/errors.js';
import { round2, serviceFee, toThb } from '../../lib/money.js';
import { refundQuote } from '../../lib/refund.js';
import { fromPostgrest, unwrap } from '../../plugins/errors.js';
import { admin, type Db } from '../../plugins/supabase.js';
import type { BookingDto, PriceBreakdownDto, SlotDto } from '../../types/dto.js';
import { toSummary, type SummaryRow } from '../experiences/mappers.js';
import { toPaymentMethod, type PaymentMethodRow } from '../paymentMethods/service.js';
import { recordRedemption, validatePromo } from '../promos/service.js';
import { getSlot, toSlot, type SlotRow } from '../slots/service.js';
import type { createBookingBody, listBookingsQuery, rescheduleBookingBody } from './schemas.js';
import type { z } from 'zod';

interface BookingRow {
  id: string;
  user_id: string;
  experience_id: string;
  slot_id: string;
  mode: string;
  guests: number;
  subtotal_thb: string | number;
  tax_thb: string | number;
  total_thb: string | number;
  discount_thb: string | number;
  promo_code: string | null;
  status: string;
  preparation_note: string | null;
  payment_method_id: string | null;
  cancelled_at: string | null;
  created_at: string;
  experience_slots: SlotRow | null;
  payment_methods: PaymentMethodRow | null;
}

/*
 * experience_slots and payment_methods are embedded through real foreign keys.
 * The experience is not: the card data lives in the experience_summary VIEW, and
 * PostgREST cannot embed a view through bookings.experience_id. So summaries are
 * batch-loaded by id and merged in — one extra query, never N.
 */
const SELECT = '*, experience_slots(*), payment_methods(id, kind, brand, label, last4, is_default)';

async function loadSummaries(db: Db, ids: string[]): Promise<Map<string, SummaryRow>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data } = await db.from('experience_summary').select('*').in('id', unique);
  return new Map(((data ?? []) as SummaryRow[]).map((row) => [row.id, row]));
}

function toBooking(row: BookingRow, summaries: Map<string, SummaryRow>): BookingDto {
  const slot = row.experience_slots ? toSlot(row.experience_slots) : null;
  const totalThb = toThb(row.total_thb);
  const summary = summaries.get(row.experience_id) ?? null;

  return {
    id: row.id,
    status: row.status,
    mode: row.mode,
    guests: row.guests,
    subtotalThb: toThb(row.subtotal_thb),
    discountThb: toThb(row.discount_thb),
    taxThb: toThb(row.tax_thb),
    totalThb,
    promoCode: row.promo_code,
    preparationNote: row.preparation_note,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
    slot,
    experience: summary ? toSummary(summary) : null,
    paymentMethod: row.payment_methods ? toPaymentMethod(row.payment_methods) : null,
    refund:
      slot && row.status !== 'cancelled' ? refundQuoteDto(slot.startsAt, totalThb) : null,
  };
}

function refundQuoteDto(startsAt: string, totalThb: number) {
  const q = refundQuote(startsAt, totalThb);
  return {
    tier: q.key,
    feePct: q.feePct,
    feeThb: q.feeThb,
    refundThb: q.refundThb,
    cancelLabel: q.cancelLabel,
    modifyLabel: q.modifyLabel,
    cancelDetail: q.cancelDetail,
    modifyDetail: q.modifyDetail,
    hoursUntilStart: q.hoursUntilStart,
  };
}

/**
 * Price a booking.
 *
 * Always derived from the slot's own `price_amount` and the promo table — never
 * from anything the client sends. The client's own totals are display only.
 */
export async function quote(
  db: Db,
  slotId: string,
  guests: number,
  promoCode?: string,
): Promise<{ breakdown: PriceBreakdownDto; slot: SlotDto; promo: Awaited<ReturnType<typeof validatePromo>> | null }> {
  const slotRow = await getSlot(db, slotId);
  const slot = toSlot(slotRow);

  const unit = slot.price;
  // A flat private session is priced per booking; a group slot is per head.
  const subtotal = round2(slot.mode === 'private' ? unit : unit * guests);

  const promo = promoCode ? await validatePromo(db, promoCode, subtotal) : null;
  const discount = promo?.valid ? promo.discountThb : 0;
  const fee = serviceFee(subtotal - discount);

  return {
    slot,
    promo,
    breakdown: {
      unit,
      guests,
      subtotal,
      discount,
      serviceFee: fee,
      total: round2(subtotal - discount + fee),
      currency: slot.currency,
    },
  };
}

export async function listBookings(
  db: Db,
  userId: string,
  filter: z.infer<typeof listBookingsQuery>['status'],
): Promise<{ upcoming: BookingDto[]; past: BookingDto[]; cancelled: BookingDto[] }> {
  const rows = (unwrap(
    await db.from('bookings').select(SELECT).eq('user_id', userId).order('created_at', { ascending: false }),
  ) ?? []) as unknown as BookingRow[];

  const summaries = await loadSummaries(db, rows.map((r) => r.experience_id));
  const now = Date.now();
  const all = rows.map((r) => toBooking(r, summaries));

  const cancelled = all.filter((b) => b.status === 'cancelled');
  const active = all.filter((b) => b.status !== 'cancelled');

  const started = (b: BookingDto) => (b.slot ? new Date(b.slot.startsAt).getTime() <= now : false);

  const result = {
    upcoming: active
      .filter((b) => !started(b))
      .sort((a, b) => (a.slot?.startsAt ?? '').localeCompare(b.slot?.startsAt ?? '')),
    past: active
      .filter(started)
      .sort((a, b) => (b.slot?.startsAt ?? '').localeCompare(a.slot?.startsAt ?? '')),
    cancelled,
  };

  if (filter === 'all') return result;
  return {
    upcoming: filter === 'upcoming' ? result.upcoming : [],
    past: filter === 'past' ? result.past : [],
    cancelled: filter === 'cancelled' ? result.cancelled : [],
  };
}

export async function getBooking(db: Db, userId: string, id: string): Promise<BookingDto> {
  const { data, error } = await db
    .from('bookings')
    .select(SELECT)
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw fromPostgrest(error) ?? ApiError.notFound();
  if (!data) throw ApiError.notFound('We could not find that booking.');
  const row = data as unknown as BookingRow;
  return toBooking(row, await loadSummaries(db, [row.experience_id]));
}

export async function createBooking(
  db: Db,
  userId: string,
  input: z.infer<typeof createBookingBody>,
): Promise<BookingDto> {
  const slotRow = await getSlot(db, input.slotId);

  if (slotRow.experience_id !== input.experienceId) {
    throw ApiError.badRequest('That time slot belongs to a different experience.');
  }
  if (slotRow.status !== 'open') {
    throw ApiError.conflict('slot_unavailable', 'That time is no longer available.');
  }
  if (new Date(slotRow.starts_at).getTime() <= Date.now()) {
    throw ApiError.conflict('slot_past', 'That session has already started.');
  }

  const spotsLeft = slotRow.capacity - slotRow.booked_count;
  if (input.guests > spotsLeft) {
    throw ApiError.conflict(
      'slot_full',
      spotsLeft === 0
        ? 'That time just filled up. Pick another slot.'
        : `Only ${spotsLeft} ${spotsLeft === 1 ? 'spot is' : 'spots are'} left at that time.`,
    );
  }

  const { breakdown, promo } = await quote(db, input.slotId, input.guests, input.promoCode);

  // The bookings_check_capacity trigger re-checks capacity under a row lock, so
  // a race between the check above and this insert still fails safely with 409.
  const { data, error } = await db
    .from('bookings')
    .insert({
      user_id: userId,
      experience_id: input.experienceId,
      slot_id: input.slotId,
      mode: slotRow.mode,
      guests: input.guests,
      subtotal_thb: breakdown.subtotal,
      discount_thb: breakdown.discount,
      tax_thb: breakdown.serviceFee,
      total_thb: breakdown.total,
      promo_code: promo?.valid ? promo.code : null,
      payment_method_id: input.paymentMethodId ?? null,
      preparation_note: input.preparationNote ?? null,
      // No payment processor yet — a created booking is immediately confirmed.
      status: 'booked',
    })
    .select(SELECT)
    .single();

  if (error) throw fromPostgrest(error) ?? new ApiError(500, 'booking_failed', error.message);

  if (promo?.valid) await recordRedemption(admin, promo.code);

  const row = data as unknown as BookingRow;
  return toBooking(row, await loadSummaries(db, [row.experience_id]));
}

export async function rescheduleBooking(
  db: Db,
  userId: string,
  id: string,
  input: z.infer<typeof rescheduleBookingBody>,
): Promise<BookingDto> {
  const existing = await getBooking(db, userId, id);
  if (existing.status === 'cancelled') {
    throw ApiError.conflict('booking_cancelled', 'That booking was cancelled and cannot be moved.');
  }

  const target = await getSlot(db, input.slotId);
  if (existing.experience?.id && target.experience_id !== existing.experience.id) {
    throw ApiError.badRequest('You can only move a booking to another time for the same experience.');
  }
  if (target.status !== 'open') {
    throw ApiError.conflict('slot_unavailable', 'That time is no longer available.');
  }

  const guests = input.guests ?? existing.guests;
  const spotsLeft = target.capacity - target.booked_count;
  if (guests > spotsLeft) {
    throw ApiError.conflict('slot_full', 'That time does not have room for your party.');
  }

  /*
   * The slot counters are maintained by AFTER INSERT / AFTER UPDATE triggers
   * that only fire on a booking being created or cancelled — nothing moves the
   * count between two slots. So a reschedule is modelled as cancel + rebook,
   * which lets the existing triggers keep both slots' booked_count correct.
   *
   * These are two statements, not one transaction: if the insert fails the
   * original booking stays cancelled. That is why capacity is checked first,
   * and why this should move into a Postgres function when reschedule volume
   * justifies it.
   */
  const { breakdown } = await quote(db, input.slotId, guests);

  unwrap(
    await db
      .from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id'),
  );

  const { data, error } = await db
    .from('bookings')
    .insert({
      user_id: userId,
      experience_id: target.experience_id,
      slot_id: target.id,
      mode: target.mode,
      guests,
      subtotal_thb: breakdown.subtotal,
      discount_thb: 0,
      tax_thb: breakdown.serviceFee,
      total_thb: breakdown.total,
      payment_method_id: null,
      status: 'booked',
    })
    .select(SELECT)
    .single();

  if (error) throw fromPostgrest(error) ?? new ApiError(500, 'reschedule_failed', error.message);
  const row = data as unknown as BookingRow;
  return toBooking(row, await loadSummaries(db, [row.experience_id]));
}

export async function cancelBooking(db: Db, userId: string, id: string) {
  const existing = await getBooking(db, userId, id);
  if (existing.status === 'cancelled') {
    throw ApiError.conflict('already_cancelled', 'That booking is already cancelled.');
  }
  if (!existing.slot) throw ApiError.badRequest('That booking has no time slot.');

  // Quote before the write, so the fee is the one the user was shown.
  const refund = refundQuote(existing.slot.startsAt, existing.totalThb);

  const { data, error } = await db
    .from('bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select(SELECT)
    .single();

  if (error) throw fromPostgrest(error) ?? new ApiError(500, 'cancel_failed', error.message);

  const row = data as unknown as BookingRow;
  return {
    booking: toBooking(row, await loadSummaries(db, [row.experience_id])),
    refund: {
      tier: refund.key,
      feePct: refund.feePct,
      feeThb: refund.feeThb,
      refundThb: refund.refundThb,
      cancelLabel: refund.cancelLabel,
      modifyLabel: refund.modifyLabel,
      cancelDetail: refund.cancelDetail,
      modifyDetail: refund.modifyDetail,
      hoursUntilStart: refund.hoursUntilStart,
    },
  };
}
