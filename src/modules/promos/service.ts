import { round2 } from '../../lib/money.js';
import type { Db } from '../../plugins/supabase.js';
import type { PromoValidationDto } from '../../types/dto.js';

interface PromoRow {
  code: string;
  description: string | null;
  discount_type: 'percent' | 'fixed';
  discount_value: string | number;
  min_subtotal_thb: string | number;
  max_discount_thb: string | number | null;
  is_active: boolean;
  valid_from: string | null;
  valid_to: string | null;
  max_redemptions: number | null;
  redeemed_count: number;
}

const invalid = (code: string, message: string): PromoValidationDto => ({
  valid: false,
  code,
  description: null,
  discountThb: 0,
  message,
});

/**
 * Validate a code against a subtotal and return the discount it would apply.
 *
 * Returns `{ valid: false }` rather than throwing: a mistyped promo code is a
 * normal thing for a person to do, and the checkout screen shows the message
 * inline instead of treating it as an error.
 */
export async function validatePromo(
  db: Db,
  rawCode: string,
  subtotalThb: number,
): Promise<PromoValidationDto> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return invalid(code, 'Enter a promo code.');

  const { data } = await db.from('promo_codes').select('*').eq('code', code).maybeSingle();
  const promo = data as PromoRow | null;

  if (!promo || !promo.is_active) return invalid(code, "That code isn't valid.");

  const now = Date.now();
  if (promo.valid_from && new Date(promo.valid_from).getTime() > now) {
    return invalid(code, "That code isn't active yet.");
  }
  if (promo.valid_to && new Date(promo.valid_to).getTime() < now) {
    return invalid(code, 'That code has expired.');
  }
  if (promo.max_redemptions !== null && promo.redeemed_count >= promo.max_redemptions) {
    return invalid(code, 'That code has been fully redeemed.');
  }

  const minSubtotal = Number(promo.min_subtotal_thb ?? 0);
  if (subtotalThb < minSubtotal) {
    return invalid(code, `That code needs a subtotal of at least THB ${minSubtotal}.`);
  }

  const value = Number(promo.discount_value);
  let discount =
    promo.discount_type === 'percent' ? (subtotalThb * value) / 100 : value;

  if (promo.max_discount_thb !== null) {
    discount = Math.min(discount, Number(promo.max_discount_thb));
  }
  // Never discount below zero-cost.
  discount = round2(Math.min(discount, subtotalThb));

  return {
    valid: true,
    code,
    description: promo.description,
    discountThb: discount,
    message: null,
  };
}

/** Bump the redemption counter. Service-role only — there is no RLS write policy. */
export async function recordRedemption(admin: Db, code: string): Promise<void> {
  const { data } = await admin.from('promo_codes').select('redeemed_count').eq('code', code).maybeSingle();
  const current = (data as { redeemed_count: number } | null)?.redeemed_count;
  if (current === undefined) return;
  await admin.from('promo_codes').update({ redeemed_count: current + 1 }).eq('code', code);
}
