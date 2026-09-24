/**
 * Generate a rolling window of bookable time slots. Idempotent.
 *
 * Slots were originally produced by 20260326000000_refresh_experience_slots.sql,
 * but a migration only runs once — on a hosted project the window ages out and
 * the booking calendar goes empty. This script does the same job and can be run
 * on a schedule.
 *
 * It also gives each day several times rather than the migration's single one,
 * which is what the booking screen's time list expects.
 *
 * Usage: npm run db:slots [-- --days 21]
 */
import { admin } from '../src/plugins/supabase.js';

const DAYS_AHEAD = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 14);

/**
 * Thailand is UTC+7 year-round and has never observed DST, so a fixed offset is
 * correct here. Anywhere with DST would need a real timezone conversion.
 */
const BANGKOK_OFFSET_HOURS = 7;

/** Times of day each experience runs, as [hour, minute]. */
const GROUP_TIMES: [number, number][] = [
  [10, 0],
  [12, 30],
  [16, 0],
  [18, 30],
];
const PRIVATE_TIMES: [number, number][] = [[14, 0]];

const HEALING_ID = 'eeee0001-0001-4001-8001-000000000006';

function bangkokTime(dayOffset: number, hour: number, minute: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + dayOffset,
      hour - BANGKOK_OFFSET_HOURS,
      minute,
    ),
  );
}

interface Experience {
  id: string;
  duration_minutes: number | null;
  price_amount: string | number | null;
}

async function main() {
  console.log(`Refreshing slots for the next ${DAYS_AHEAD} days\n`);

  // Drop past slots nobody booked, so the table does not grow without bound.
  const { data: stale } = await admin
    .from('experience_slots')
    .select('id')
    .lt('starts_at', new Date().toISOString());

  const staleIds = ((stale ?? []) as { id: string }[]).map((s) => s.id);
  if (staleIds.length) {
    const { data: booked } = await admin
      .from('bookings')
      .select('slot_id')
      .in('slot_id', staleIds)
      .neq('status', 'cancelled');

    const keep = new Set(((booked ?? []) as { slot_id: string }[]).map((b) => b.slot_id));
    const deletable = staleIds.filter((id) => !keep.has(id));

    if (deletable.length) {
      await admin.from('experience_slots').delete().in('id', deletable);
      console.log(`  - removed ${deletable.length} past unbooked slots`);
    }
  }

  const { data: experiences, error } = await admin
    .from('experience_summary')
    .select('id, duration_minutes, price_amount');
  if (error) throw error;

  const rows: Record<string, unknown>[] = [];

  for (const exp of (experiences ?? []) as Experience[]) {
    const durationMinutes = exp.duration_minutes ?? 60;
    const groupPrice = Number(exp.price_amount ?? 0);
    if (!groupPrice) {
      console.warn(`  ! ${exp.id} has no active price — skipping`);
      continue;
    }

    const schedule: { times: [number, number][]; mode: 'group' | 'private'; price: number }[] = [
      { times: GROUP_TIMES, mode: 'group', price: groupPrice },
    ];
    // The Self-Healing listing also sells private sessions at a flat rate.
    if (exp.id === HEALING_ID) {
      schedule.push({ times: PRIVATE_TIMES, mode: 'private', price: 13000 });
    }

    for (let day = 0; day < DAYS_AHEAD; day += 1) {
      for (const { times, mode, price } of schedule) {
        for (const [hour, minute] of times) {
          const startsAt = bangkokTime(day, hour, minute);
          if (startsAt.getTime() <= Date.now()) continue; // today's earlier times

          rows.push({
            experience_id: exp.id,
            starts_at: startsAt.toISOString(),
            ends_at: new Date(startsAt.getTime() + durationMinutes * 60_000).toISOString(),
            mode,
            capacity: mode === 'private' ? 1 : 10,
            price_amount: price,
            currency: 'THB',
          });
        }
      }
    }
  }

  // Skip anything already generated — (experience_id, starts_at, mode) is the
  // natural key, but there is no unique constraint on it, so filter in memory.
  const { data: existing } = await admin
    .from('experience_slots')
    .select('experience_id, starts_at, mode')
    .gte('starts_at', new Date().toISOString());

  const seen = new Set(
    ((existing ?? []) as { experience_id: string; starts_at: string; mode: string }[]).map(
      (s) => `${s.experience_id}|${new Date(s.starts_at).toISOString()}|${s.mode}`,
    ),
  );

  const fresh = rows.filter((r) => !seen.has(`${r.experience_id}|${r.starts_at}|${r.mode}`));

  if (fresh.length === 0) {
    console.log('  · already up to date');
  } else {
    // Chunked so a wide window does not hit the request size limit.
    for (let i = 0; i < fresh.length; i += 500) {
      const { error: insertError } = await admin.from('experience_slots').insert(fresh.slice(i, i + 500));
      if (insertError) throw insertError;
    }
    console.log(`  + inserted ${fresh.length} slots`);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('\nSlot refresh failed:', err.message ?? err);
  process.exit(1);
});
