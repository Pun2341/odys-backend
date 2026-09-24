import { z } from 'zod';
import { ApiError } from '../../lib/errors.js';
import { unwrap } from '../../plugins/errors.js';
import { admin, type Db } from '../../plugins/supabase.js';
import type { AuthUser } from '../../plugins/auth.js';
import type { ProfileDto } from '../../types/dto.js';

interface ProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  phone_country_code: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export const updateProfileBody = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  phoneCountryCode: z.string().trim().max(8).optional(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
  bio: z.string().trim().max(2000).optional(),
});

const initialOf = (name: string | null, email: string | null) =>
  (name?.trim()?.[0] ?? email?.trim()?.[0] ?? '?').toUpperCase();

export async function getProfile(db: Db, user: AuthUser): Promise<ProfileDto> {
  const { data, error } = await db
    .from('profiles')
    .select('id, full_name, phone, phone_country_code, avatar_url, bio')
    .eq('id', user.id)
    .maybeSingle();

  if (error) unwrap({ data, error });
  if (!data) throw ApiError.notFound('We could not find your profile.');
  const row = data as ProfileRow;

  // Counts drive the badges on the profile screen.
  const [reviews, bookings, saved] = await Promise.all([
    db.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('user_id', user.id).neq('status', 'cancelled'),
    db.from('saved_experiences').select('experience_id', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);

  return {
    id: row.id,
    fullName: row.full_name,
    // profiles has no email column — the address lives in auth.users.
    email: user.email,
    phone: row.phone,
    phoneCountryCode: row.phone_country_code,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    initial: initialOf(row.full_name, user.email),
    reviewCount: reviews.count ?? 0,
    bookingCount: bookings.count ?? 0,
    savedCount: saved.count ?? 0,
  };
}

export async function updateProfile(
  db: Db,
  user: AuthUser,
  input: z.infer<typeof updateProfileBody>,
): Promise<ProfileDto> {
  const patch: Record<string, unknown> = {};
  if (input.fullName !== undefined) patch.full_name = input.fullName;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.phoneCountryCode !== undefined) patch.phone_country_code = input.phoneCountryCode;
  if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;
  if (input.bio !== undefined) patch.bio = input.bio;

  if (Object.keys(patch).length > 0) {
    unwrap(await db.from('profiles').update(patch).eq('id', user.id).select('id'));
  }

  return getProfile(db, user);
}

/**
 * Change the account email. This is an auth.users write, so it goes through the
 * Admin API rather than the profiles table.
 */
export async function updateEmail(user: AuthUser, email: string): Promise<void> {
  const { error } = await admin.auth.admin.updateUserById(user.id, { email });
  if (error) throw ApiError.badRequest(error.message);
}
