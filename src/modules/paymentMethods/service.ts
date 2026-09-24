import { z } from 'zod';
import { ApiError } from '../../lib/errors.js';
import { unwrap } from '../../plugins/errors.js';
import type { Db } from '../../plugins/supabase.js';
import type { PaymentMethodDto } from '../../types/dto.js';

export interface PaymentMethodRow {
  id: string;
  kind: string;
  brand: string | null;
  label: string;
  last4: string | null;
  is_default: boolean;
}

export const toPaymentMethod = (row: PaymentMethodRow): PaymentMethodDto => ({
  id: row.id,
  kind: row.kind,
  brand: row.brand,
  label: row.label,
  last4: row.last4,
  isDefault: row.is_default,
});

const COLUMNS = 'id, kind, brand, label, last4, is_default';

export const createPaymentMethodBody = z.object({
  kind: z.enum(['card', 'apple', 'google', 'promptpay']),
  label: z.string().trim().min(1).max(100),
  brand: z.string().trim().max(50).optional(),
  /** Display digits only — this API never receives a full card number. */
  last4: z.string().regex(/^[0-9]{4}$/, 'Enter the last four digits.').optional(),
  isDefault: z.boolean().default(false),
});

export async function listPaymentMethods(db: Db, userId: string): Promise<PaymentMethodDto[]> {
  const rows = (unwrap(
    await db
      .from('payment_methods')
      .select(COLUMNS)
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true }),
  ) ?? []) as PaymentMethodRow[];
  return rows.map(toPaymentMethod);
}

/** Clear the current default so the unique-default index never trips. */
async function clearDefault(db: Db, userId: string) {
  await db.from('payment_methods').update({ is_default: false }).eq('user_id', userId).eq('is_default', true);
}

export async function createPaymentMethod(
  db: Db,
  userId: string,
  input: z.infer<typeof createPaymentMethodBody>,
): Promise<PaymentMethodDto> {
  const existing = await listPaymentMethods(db, userId);
  // The first method a user adds is their default whether they asked or not.
  const isDefault = input.isDefault || existing.length === 0;

  if (isDefault) await clearDefault(db, userId);

  const row = unwrap(
    await db
      .from('payment_methods')
      .insert({
        user_id: userId,
        kind: input.kind,
        label: input.label,
        brand: input.brand ?? null,
        last4: input.last4 ?? null,
        is_default: isDefault,
      })
      .select(COLUMNS)
      .single(),
  ) as PaymentMethodRow;

  return toPaymentMethod(row);
}

export async function setDefaultPaymentMethod(
  db: Db,
  userId: string,
  id: string,
): Promise<PaymentMethodDto> {
  await clearDefault(db, userId);

  const { data, error } = await db
    .from('payment_methods')
    .update({ is_default: true })
    .eq('id', id)
    .eq('user_id', userId)
    .select(COLUMNS)
    .maybeSingle();

  if (error) unwrap({ data, error });
  if (!data) throw ApiError.notFound('We could not find that payment method.');
  return toPaymentMethod(data as PaymentMethodRow);
}

export async function deletePaymentMethod(db: Db, userId: string, id: string): Promise<void> {
  const { data, error } = await db
    .from('payment_methods')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, is_default')
    .maybeSingle();

  if (error) unwrap({ data, error });
  if (!data) throw ApiError.notFound('We could not find that payment method.');

  // Promote another method so the user is never left without a default.
  if ((data as { is_default: boolean }).is_default) {
    const remaining = await listPaymentMethods(db, userId);
    const next = remaining[0];
    if (next) await setDefaultPaymentMethod(db, userId, next.id);
  }
}
