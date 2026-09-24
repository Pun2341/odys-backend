/**
 * Demo data seed. Idempotent — safe to re-run.
 *
 * Structural seeds (lookups, the six experiences, pricing, tags, promo codes)
 * live in migrations. This script covers everything that needs auth.users rows
 * or the Admin API, which migrations cannot create:
 *
 *   - a host account, so experiences have an owner and host_profiles is non-empty
 *   - a demo customer, whose id goes in DEV_AUTH_USER_ID for the auth stub
 *   - reviews, so cards have a rating instead of nothing
 *   - per-experience detail content and FAQs
 *   - payment methods for the demo customer
 *
 * Usage: npm run db:seed
 */
import { admin } from '../src/plugins/supabase.js';

const HOST_EMAIL = 'john.doe@odys.app';
const CUSTOMER_EMAIL = 'maywa@odys.app';
const PASSWORD = 'odys-demo-password';

const EXPERIENCES = {
  pottery: 'eeee0001-0001-4001-8001-000000000001',
  horseback: 'eeee0001-0001-4001-8001-000000000002',
  sound: 'eeee0001-0001-4001-8001-000000000003',
  cooking: 'eeee0001-0001-4001-8001-000000000004',
  flowers: 'eeee0001-0001-4001-8001-000000000005',
  healing: 'eeee0001-0001-4001-8001-000000000006',
} as const;

/** Create the user if missing; return the id either way. */
async function ensureUser(email: string, fullName: string): Promise<string> {
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw listError;

  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    console.log(`  · ${email} already exists`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  console.log(`  + created ${email}`);
  return data.user.id;
}

/**
 * The on_auth_user_created trigger inserts a bare profiles row; fill in the rest.
 * Upsert rather than update so the seed still works if that trigger is ever off.
 */
async function upsertProfile(id: string, fields: Record<string, unknown>) {
  const { error } = await admin.from('profiles').upsert({ id, ...fields }, { onConflict: 'id' });
  if (error) throw error;
}

const CONTENT: Record<string, { about: string; quickFacts: string[]; steps: string[]; included: string[]; bring: string[]; know: string[]; meetingPoint: string; faqs: [string, string][] }> = {
  [EXPERIENCES.pottery]: {
    about: 'A hands-on introduction to the wheel. You will learn to centre clay, pull a wall, and finish a small vessel you can take home once it has been fired and glazed. No experience needed — most people arrive having never touched a wheel.',
    quickFacts: ['Small groups, max 10', 'All clay and tools provided', 'Aprons available', 'Firing takes 2 weeks'],
    steps: ['Meet your host and get set up at a wheel', 'Wedging and centring the clay', 'Throw your first vessel', 'Trim, sign and leave it to dry'],
    included: ['1kg of stoneware clay', 'Tools and apron', 'Firing and glazing', 'Tea and snacks'],
    bring: ['Clothes you do not mind getting muddy', 'Short nails help a lot', 'A bag for your apron'],
    know: ['Wheel work is messy — expect clay on your arms', 'Pieces are ready to collect after about 2 weeks', 'Not suitable for under 12s'],
    meetingPoint: '5-min walk from BTS Phrom Phong · Exact address sent after booking',
    faqs: [
      ['Do I need any experience?', 'None at all. Most people who come have never touched a wheel, and the class is built around that.'],
      ['When can I collect my piece?', 'Firing and glazing take about two weeks. You can collect from the studio or pay for shipping within Thailand.'],
      ['What should I wear?', 'Something you do not mind staining. Aprons are provided but clay finds a way.'],
    ],
  },
  [EXPERIENCES.horseback]: {
    about: 'A guided trail ride along the coast, paced for the people in the group. Beginners spend time getting comfortable in the saddle before heading out; confident riders can pick up the pace on the open stretches.',
    quickFacts: ['Riders 12 and up', 'Max weight 90kg', 'Helmets provided', 'Runs rain or shine'],
    steps: ['Safety briefing and meet your horse', 'Arena time to get comfortable', 'Coastal trail ride', 'Cool down and photos'],
    included: ['Horse and tack', 'Helmet and safety gear', 'Guide', 'Water'],
    bring: ['Long trousers', 'Closed shoes with a small heel', 'Sunscreen and a hat'],
    know: ['Rides go ahead in light rain', 'Let us know your riding experience when you book', 'Not suitable during pregnancy'],
    meetingPoint: 'Ranch gate, Pattaya · Parking on site',
    faqs: [
      ['I have never ridden before. Is that okay?', 'Yes. You will spend time in the arena first and the trail is chosen to suit the group.'],
      ['Is there a weight limit?', 'Yes, 90kg, for the welfare of the horses.'],
    ],
  },
  [EXPERIENCES.sound]: {
    about: 'A sound bath built around singing bowls, chimes and gong. You lie down, get comfortable, and let the sound do the work. People often describe it as the deepest rest they have had in weeks.',
    quickFacts: ['Lying down throughout', 'Mats and blankets provided', 'No experience needed', 'Quiet room'],
    steps: ['Settle in and set an intention', 'Guided breathing to slow down', 'The sound bath itself', 'Slow return and tea'],
    included: ['Mat, bolster and blanket', 'Eye pillow', 'Herbal tea afterwards'],
    bring: ['Comfortable clothes', 'Socks — the room is air conditioned', 'An open mind'],
    know: ['Please arrive 10 minutes early; late entry disturbs the room', 'Let the host know about ear conditions or pregnancy', 'Phones stay outside'],
    meetingPoint: '5-min walk from BTS Phrom Phong · Exact address sent after booking',
    faqs: [
      ['Will I need to meditate?', 'No. You lie down and listen. There is nothing you need to do correctly.'],
      ['Can I come if I am pregnant?', 'Yes, but tell the host beforehand so they can adjust the gong work.'],
    ],
  },
  [EXPERIENCES.cooking]: {
    about: 'Start at a local market choosing herbs and produce, then cook three Thai dishes from scratch and eat them together. You leave with recipes scaled for a home kitchen and a much better idea of what to buy.',
    quickFacts: ['Market tour included', 'Three dishes', 'Vegetarian option available', 'Groups of 2-12'],
    steps: ['Market walk and ingredient hunt', 'Pound your own curry paste', 'Cook three dishes', 'Sit down and eat'],
    included: ['All ingredients', 'Market tour', 'The meal you cook', 'Recipe cards to take home'],
    bring: ['An appetite', 'Comfortable shoes for the market', 'A container for leftovers'],
    know: ['Tell us about allergies when you book', 'The kitchen is hot — dress lightly', 'Vegetarian and vegan versions available on request'],
    meetingPoint: 'Market entrance, Bangkok · Exact address sent after booking',
    faqs: [
      ['Can you cater to allergies?', 'Yes, tell us when you book and the host will adjust the menu.'],
      ['Is there a vegetarian option?', 'Yes, and a vegan one. Mention it at booking.'],
    ],
  },
  [EXPERIENCES.flowers]: {
    about: 'An ikebana-inspired workshop using seasonal Thai flowers. Less about following a formula than learning to look — at line, at space, at what to leave out. You take your arrangement home.',
    quickFacts: ['Seasonal flowers', 'Vessel included', 'Beginner friendly', 'Max 10 people'],
    steps: ['Look at the season’s flowers', 'Principles of line and space', 'Build your arrangement', 'Final adjustments and wrap'],
    included: ['All flowers and foliage', 'A ceramic vessel to keep', 'Tools', 'Tea'],
    bring: ['Nothing — everything is provided', 'A bag if you want to carry the vessel home'],
    know: ['Flowers vary with the season', 'Arrangements travel best by car or taxi'],
    meetingPoint: '5-min walk from BTS Phrom Phong · Exact address sent after booking',
    faqs: [['Do I keep the vase?', 'Yes, the ceramic vessel is yours to take home.']],
  },
  [EXPERIENCES.healing]: {
    about: 'A gentle, restorative practice for anyone carrying more than they would like to. Breath work, guided meditation and a long closing rest. John has taught this for nine years and paces it to whoever is in the room.',
    quickFacts: ['Small groups, max 10', 'No experience needed', 'Mats provided', 'Private sessions available'],
    steps: ['Arrive and settle', 'Breath work to down-regulate', 'Guided meditation', 'Closing rest and reflection'],
    included: ['Mat and bolster', 'Blanket', 'Tea afterwards', 'A short practice to take home'],
    bring: ['Comfortable clothes', 'Socks', 'A journal if you like to write things down'],
    know: ['Arrive 10 minutes early', 'Room is quiet and phone-free', 'Private one-to-one sessions can be booked'],
    meetingPoint: '5-min walk from BTS Phrom Phong · Exact address sent after booking',
    faqs: [
      ['Can I attend if I have never meditated before?', 'Absolutely. Most people in the room have not, and John paces the session to whoever turns up.'],
      ['What if I get restless?', 'That is normal and expected. You can shift, stretch or sit up at any point.'],
      ['Do you offer private sessions?', 'Yes — private slots appear alongside the group ones in the booking calendar.'],
    ],
  },
};

const REVIEW_BODIES = [
  [5, 'Honestly one of the most peaceful hours I have had in months. Left feeling completely reset.'],
  [5, 'Exactly what I needed. The host reads the room really well and never makes you feel behind.'],
  [4, 'Really enjoyed it. Slightly rushed at the end but that is a small thing.'],
  [5, 'Came on my own and did not feel awkward for a second. Would do it again.'],
  [4, 'Great value for what you get. The space is lovely and everything is provided.'],
  [5, 'Booked it on a whim and it turned out to be the best part of the trip.'],
] as const;

/** Extra accounts so review authors are not the same two names over and over. */
const REVIEWERS = [
  ['sarah.chen@example.com', 'Sarah Chen'],
  ['nok.p@example.com', 'Nok Panyarachun'],
  ['daniel.oyelaran@example.com', 'Daniel Oyelaran'],
  ['mei.tan@example.com', 'Mei Tan'],
] as const;

async function seedContent() {
  const contentRows = Object.entries(CONTENT).map(([experienceId, c]) => ({
    experience_id: experienceId,
    about: c.about,
    quick_facts: c.quickFacts,
    steps: c.steps,
    included: c.included,
    what_to_bring: c.bring,
    good_to_know: c.know,
    meeting_point: c.meetingPoint,
  }));

  const { error } = await admin.from('experience_content').upsert(contentRows, { onConflict: 'experience_id' });
  if (error) throw error;
  console.log(`  + ${contentRows.length} content rows`);

  // FAQs have generated ids, so clear and rewrite rather than upsert.
  for (const [experienceId, c] of Object.entries(CONTENT)) {
    await admin.from('experience_faq').delete().eq('experience_id', experienceId);
    const rows = c.faqs.map(([question, answer], i) => ({
      experience_id: experienceId,
      question,
      answer,
      sort_order: i,
    }));
    const { error: faqError } = await admin.from('experience_faq').insert(rows);
    if (faqError) throw faqError;
  }
  console.log('  + FAQs');
}

/**
 * Per-experience review mix.
 *
 * Deliberately uneven. Giving every listing the same set made each one average
 * 4.67 from 6 reviews, so every card showed an identical score and the home
 * rails — which sort by rating and review count — all collapsed into the same
 * order. Varied ratings are what make those rails different from each other.
 */
const REVIEW_PLAN: Record<string, number[]> = {
  [EXPERIENCES.pottery]: [5, 5, 5, 4, 5, 5, 4, 5],
  [EXPERIENCES.horseback]: [4, 5, 4, 4, 3],
  [EXPERIENCES.sound]: [5, 5, 5, 5, 5, 5, 4],
  [EXPERIENCES.cooking]: [5, 4, 5, 5, 4, 5, 5, 5, 4],
  [EXPERIENCES.flowers]: [4, 5, 4, 5],
  [EXPERIENCES.healing]: [5, 5, 4, 5, 5, 5],
};

async function seedReviews(reviewerIds: string[]) {
  // Rewritten each run rather than skipped, so re-seeding actually refreshes
  // the mix. Only the demo reviews are removed — anything written through the
  // app by a real account is left alone.
  const demoAuthors = reviewerIds.filter(Boolean);
  await admin
    .from('reviews')
    .delete()
    .in('experience_id', Object.values(EXPERIENCES))
    .in('user_id', demoAuthors);

  const rows = Object.entries(REVIEW_PLAN).flatMap(([experienceId, ratings], expIndex) =>
    ratings.map((rating, i) => ({
      experience_id: experienceId,
      // Rotate authors so reviews are not all by the same person.
      user_id: reviewerIds[(expIndex + i) % reviewerIds.length]!,
      rating,
      body: REVIEW_BODIES[(expIndex * 2 + i) % REVIEW_BODIES.length]![1],
    })),
  );

  const { error } = await admin.from('reviews').insert(rows);
  if (error) throw error;

  const summary = Object.entries(REVIEW_PLAN)
    .map(([, r]) => (r.reduce((a, b) => a + b, 0) / r.length).toFixed(1))
    .join(', ');
  console.log(`  + ${rows.length} reviews (averages: ${summary})`);
}

async function seedPaymentMethods(userId: string) {
  const { count } = await admin
    .from('payment_methods')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if ((count ?? 0) > 0) {
    console.log('  · payment methods already present, skipping');
    return;
  }

  const { error } = await admin.from('payment_methods').insert([
    { user_id: userId, kind: 'card', brand: 'Visa', label: 'Visa ending 4242', last4: '4242', is_default: true },
    { user_id: userId, kind: 'promptpay', label: 'PromptPay', is_default: false },
  ]);
  if (error) throw error;
  console.log('  + 2 payment methods');
}

async function main() {
  console.log('Seeding Odys demo data\n');

  console.log('Accounts');
  const hostId = await ensureUser(HOST_EMAIL, 'John Doe');
  const customerId = await ensureUser(CUSTOMER_EMAIL, 'Maywa');

  await upsertProfile(hostId, {
    full_name: 'John Doe',
    bio: 'Nine years teaching breath work and meditation in Bangkok. I keep groups small so nobody gets lost at the back.',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    phone: '+66 81 111 2222',
  });
  await upsertProfile(customerId, {
    full_name: 'Maywa',
    phone: '81 234 5678',
    phone_country_code: '+66',
  });
  console.log('  + profiles filled in');

  console.log('\nExperience ownership');
  const { error: ownerError } = await admin
    .from('experiences')
    .update({ owner_user_id: hostId })
    .in('id', Object.values(EXPERIENCES));
  if (ownerError) throw ownerError;
  console.log(`  + ${Object.keys(EXPERIENCES).length} experiences assigned to John Doe`);

  console.log('\nContent');
  await seedContent();

  console.log('\nReviewer accounts');
  const reviewerIds: string[] = [customerId];
  for (const [email, name] of REVIEWERS) {
    const id = await ensureUser(email, name);
    await upsertProfile(id, { full_name: name });
    reviewerIds.push(id);
  }

  console.log('\nReviews');
  await seedReviews(reviewerIds);

  console.log('\nPayment methods');
  await seedPaymentMethods(customerId);

  console.log('\nDone.\n');
  console.log('Put this in odys-backend/.env so the auth stub acts as the demo customer:');
  console.log(`\n  DEV_AUTH_USER_ID=${customerId}\n`);
  console.log(`Demo logins (password: ${PASSWORD})`);
  console.log(`  host     ${HOST_EMAIL}`);
  console.log(`  customer ${CUSTOMER_EMAIL}`);
  console.log('\nNext: npm run db:slots to generate bookable time slots.');
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message ?? err);
  process.exit(1);
});
