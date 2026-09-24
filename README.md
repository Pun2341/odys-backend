# odys-backend

The Odys API. Fastify + TypeScript on top of a hosted Supabase project.

Both frontends talk to this one service:

| App | Port | Status |
|---|---|---|
| `odys-customer` | 3000 | on this API |
| `odys-vendor` | 3001 | still on its own mock server — see [Vendor](#vendor) |

## Setup

```bash
npm install
cp .env.example .env        # fill in from Supabase > Project Settings > API
```

Push the schema to your hosted project, then seed it:

```bash
npx supabase link --project-ref <your-project-ref>
npm run db:push
npm run db:seed             # prints DEV_AUTH_USER_ID — paste it into .env
npm run db:slots            # generate bookable time slots
npm run dev                 # http://localhost:8080/v1
```

`db:slots` is safe to re-run and should be, periodically — it maintains a
rolling window of future slots. Without it the booking calendar empties out as
existing slots age past.

```bash
curl localhost:8080/v1/health
curl localhost:8080/v1/experiences | jq '.items[0]'
```

## Layout

```
src/
  app.ts              buildServer() — plugin and route registration
  server.ts           listen()
  env.ts              zod-validated environment
  plugins/
    supabase.ts       service-role, anon and per-request clients
    auth.ts           resolves request.user and request.db
    errors.ts         error shape + Postgres error mapping
    cors.ts
  modules/<area>/     routes.ts · service.ts · mappers.ts · schemas.ts
  lib/                money, refund policy, pagination
  types/dto.ts        the wire contract
scripts/
  seed.ts             demo accounts, content, reviews
  refreshSlots.ts     rolling slot window
supabase/migrations/  schema
```

Routes validate input with zod inside the handler and throw `ApiError`; the
error plugin turns both that and any `ZodError` into `{ message, code, details }`.

## Auth — currently stubbed

Real path: `Authorization: Bearer <supabase access token>`. The token is
verified, and `request.db` is a Supabase client carrying it, so **Postgres RLS
decides what the caller can read and write**.

Stub path: with no bearer token and `DEV_AUTH_USER_ID` set, the API acts as that
user and `request.db` is the **service-role client, which bypasses RLS**. That is
why services filter `.eq('user_id', user.id)` explicitly rather than trusting
policies. The stub is ignored when `NODE_ENV=production`.

Turning on real auth means deleting the `devAuthUserId` branch in
`src/plugins/auth.ts` and having the customer app sign in with Supabase email
OTP. Nothing else changes — every ownership check already holds on both paths.

## Conventions

**Money is THB as a number.** Postgres `decimal(10,2)` arrives from PostgREST as
a string, so every price read goes through `toThb()` in `src/lib/money.ts`.

**Prices are computed server-side.** `POST /v1/bookings` prices from the slot's
own `price_amount` and the `promo_codes` table. Totals sent by a client are
ignored. Same for cancellation fees — see `src/lib/refund.ts`.

**Capacity is enforced in the database.** `bookings_check_capacity` takes a row
lock and re-checks before every insert, so two people booking the last spot at
once cannot both succeed. The service checks first only to produce a better
message; the trigger is what makes it correct. Its error maps to `409 slot_full`.

**A reschedule is a cancel plus a rebook.** The slot counter triggers only fire
on insert and on cancellation, so moving a booking between slots goes through
both. These are two statements rather than one transaction — if the rebook fails
the original stays cancelled. Capacity is checked up front to make that
unlikely; it should become a Postgres function if reschedules get busy.

## Schema notes

- `experience_summary` is a view (`20260714000005`) flattening price, duration,
  rating, cover image, host and location into one queryable row. Location is
  only reachable through `location_model.owner_id`, which has no foreign key, so
  PostgREST cannot embed it — hence the view.
- `bookings` cannot embed that view through `experience_id`, so booking queries
  batch-load summaries by id instead.
- RLS on `experiences` is `USING (true)`, so **drafts are readable**. The view
  filters to `experience_status_code = 'published' AND deleted_at IS NULL`; query
  the view, not the table.
- Seeded covers were `gradient:linear-gradient(...)` strings rather than URLs.
  `20260714000004` replaced them, and the mapper drops any value that is not a
  URL so a stale one can never reach an `<img>`.

## Endpoints

All under `/v1`. 🔒 needs a caller (a real token, or the dev stub).

| | |
|---|---|
| `GET /health` | |
| `GET /catalog/filters` | facets derived from live data |
| `GET /catalog/discovery` | home/search/explore editorial content |
| `GET /experiences` | `q, categories, tags, maxDurationMinutes, minPrice, maxPrice, minRating, sort, limit, cursor` |
| `GET /experiences/home` | the three home rails plus a featured pick |
| `GET /experiences/:id` | full detail |
| `GET /experiences/:id/slots` | `?from&to&mode` → `{ slots, days, availableDates }` |
| `GET /experiences/:id/reviews` | paginated |
| `GET /experiences/:id/similar` | |
| `GET /experiences/:id/more-from-host` | |
| `GET /bookings/quote` | `?slotId&guests&promoCode` — price without booking |
| `POST /promos/validate` | |
| 🔒 `GET/PATCH /me` | |
| 🔒 `GET /me/saved`, `PUT`/`DELETE /me/saved/:experienceId` | |
| 🔒 `GET/POST /me/payment-methods`, `POST /:id/default`, `DELETE /:id` | |
| 🔒 `GET /me/bookings` | `?status=upcoming\|past\|cancelled\|all` |
| 🔒 `POST /bookings`, `GET /bookings/:id` | |
| 🔒 `PATCH /bookings/:id` | reschedule |
| 🔒 `POST /bookings/:id/cancel` | returns the refund quote |
| 🔒 `POST /booking-requests` | "request availability" |

## Vendor

`odys-vendor` still runs against its in-memory mock (`src/api/mock/`) and expects
a different contract — `/vendor/*` paths, nouns like "sessions" and "instructors"
that have no tables, integer-satang `priceMinor`, and a different experience
status vocabulary (`in_review` vs the DB's `submitted`/`published`). Migrating it
means reconciling those, not just pointing it at this origin.

## Not built yet

Real authentication, payment processing, messaging (the customer app's inbox is
still mock data — there are no message tables), notifications, and host-side
write endpoints.
