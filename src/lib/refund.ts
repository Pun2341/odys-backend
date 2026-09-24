import { round2 } from './money.js';

/**
 * Cancellation / reschedule fee policy.
 *
 * Ported from odys-customer/src/utils/refund.js so the refund amount is decided
 * by the server rather than the browser. The same fee applies whether a booking
 * is cancelled or rescheduled.
 *
 *   >= 24h before start : free
 *    2h – 24h           : 50% fee
 *   <  2h               : non-refundable
 */
export type RefundTierKey = 'full' | 'partial' | 'none';

export interface RefundTier {
  key: RefundTierKey;
  feePct: number;
  cancelLabel: string;
  modifyLabel: string;
  cancelDetail: string;
  modifyDetail: string;
}

const TIERS: Record<RefundTierKey, RefundTier> = {
  full: {
    key: 'full',
    feePct: 0,
    cancelLabel: 'Free cancellation',
    modifyLabel: 'Free to reschedule',
    cancelDetail: "You're outside the 24-hour window, so you'll get a full refund.",
    modifyDetail: "You're outside the 24-hour window, so you can reschedule at no extra cost.",
  },
  partial: {
    key: 'partial',
    feePct: 50,
    cancelLabel: '50% fee applies',
    modifyLabel: '50% fee applies',
    cancelDetail: "It's within 24 hours of the start time, so a 50% cancellation fee applies.",
    modifyDetail:
      "It's within 24 hours of the start time, so rescheduling carries the same 50% fee as cancelling.",
  },
  none: {
    key: 'none',
    feePct: 100,
    cancelLabel: 'Non-refundable',
    modifyLabel: 'Non-refundable',
    cancelDetail: "It's within 2 hours of the start time, so this booking is non-refundable.",
    modifyDetail:
      "It's within 2 hours of the start time, so rescheduling carries the same non-refundable fee as cancelling.",
  },
};

/** Hours between now and `startsAt` (negative once the experience has started). */
export function hoursUntil(startsAt: string | Date, now: Date = new Date()): number {
  const start = startsAt instanceof Date ? startsAt : new Date(startsAt);
  return (start.getTime() - now.getTime()) / 3_600_000;
}

export function refundTierFor(hours: number): RefundTier {
  if (hours >= 24) return TIERS.full;
  if (hours >= 2) return TIERS.partial;
  return TIERS.none;
}

export interface RefundQuote extends RefundTier {
  hoursUntilStart: number;
  feeThb: number;
  refundThb: number;
}

/** What the user is charged and refunded if they cancel `totalThb` right now. */
export function refundQuote(startsAt: string | Date, totalThb: number, now?: Date): RefundQuote {
  const hoursUntilStart = hoursUntil(startsAt, now);
  const tier = refundTierFor(hoursUntilStart);
  const feeThb = round2((totalThb * tier.feePct) / 100);
  return {
    ...tier,
    hoursUntilStart: round2(hoursUntilStart),
    feeThb,
    refundThb: round2(totalThb - feeThb),
  };
}
