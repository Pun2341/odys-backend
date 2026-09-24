import { unwrap } from '../../plugins/errors.js';
import type { Db } from '../../plugins/supabase.js';
import type { ExperienceSummaryDto } from '../../types/dto.js';
import { toSummary, type SummaryRow } from '../experiences/mappers.js';

/** Just the ids — cheap enough to keep the heart on every card in sync. */
export async function listSavedIds(db: Db, userId: string): Promise<string[]> {
  const rows = (unwrap(
    await db
      .from('saved_experiences')
      .select('experience_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ) ?? []) as { experience_id: string }[];
  return rows.map((r) => r.experience_id);
}

export async function listSaved(
  db: Db,
  userId: string,
): Promise<{ ids: string[]; items: ExperienceSummaryDto[] }> {
  const ids = await listSavedIds(db, userId);
  if (ids.length === 0) return { ids, items: [] };

  const { data } = await db.from('experience_summary').select('*').in('id', ids);
  const byId = new Map(((data ?? []) as SummaryRow[]).map((r) => [r.id, r]));

  // Preserve save order, and drop ids whose experience was unpublished or
  // deleted — the view only contains published rows.
  const items = ids.map((id) => byId.get(id)).filter((r): r is SummaryRow => !!r).map(toSummary);

  return { ids, items };
}

export async function save(db: Db, userId: string, experienceId: string): Promise<void> {
  // Idempotent: hearting something twice is a no-op, not a 409.
  unwrap(
    await db
      .from('saved_experiences')
      .upsert({ user_id: userId, experience_id: experienceId }, { onConflict: 'user_id,experience_id' })
      .select('experience_id'),
  );
}

export async function unsave(db: Db, userId: string, experienceId: string): Promise<void> {
  unwrap(
    await db
      .from('saved_experiences')
      .delete()
      .eq('user_id', userId)
      .eq('experience_id', experienceId)
      .select('experience_id'),
  );
}
