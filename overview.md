# odys-backend — Overview

The API and the database for Odys, a marketplace for booking in-person
experiences (pottery classes, sound healing, cooking, horseback riding) in
Bangkok. This repo owns the **only** schema in the system: both frontends'
data ultimately lives in the Supabase project this repo migrates and seeds.

**Stack:** Fastify 5 · TypeScript (ESM, Node 20+) · Zod · hosted Supabase
(Postgres + Auth + Storage). Serves `http://localhost:8080/v1`.

---

## What's implemented

### Shape of the service

```
src/
  app.ts          buildServer() — registers plugins, then routes under /v1
  server.ts       listen() + graceful shutdown
  env.ts          zod-validated process.env; exits with a readable error if wrong
  plugins/        supabase · auth · errors · cors
  modules/<area>/ routes.ts · service.ts · schemas.ts · mappers.ts
  lib/            money · refund · pagination · errors
  types/dto.ts    the wire contract both frontends read
scripts/          seed.ts · refreshSlots.ts
supabase/migrations/  ~40 SQL files — the whole schema
```

Routes stay thin: they parse input with Zod, call a service, and throw
`ApiError`. The error plugin turns `ApiError`, `ZodError` and raw Postgres
errors into one shape — `{ message, code, details? }` — which is exactly what
the frontends' own `ApiError` class parses.

### Database (Supabase Postgres)

Roughly 35 tables across four groups:

| Group | Tables |
|---|---|
| Identity | `profiles` (mirrors `auth.users`) |
| Catalogue | `experiences`, `pricing`, `location_model`, `locations`, `tags`, `experience_tag`, `languages`, `experience_language`, `experience_attachment`, `experience_policy`, `experience_content`, `experience_faq` |
| Reference / lookups | `experience_status`, `host_experience_type`, `skill_level`, `activity_level`, `practice_period`, `amenity`, `attachment_type`, `owner_types`, `pricing_types`, `time_unit`, … |
| Transactional | `experience_slots`, `bookings`, `booking_requests`, `reviews`, `saved_experiences`, `payment_methods`, `promo_codes` |
| Gamification | `stamp_definitions`, `user_stamps`, `reflections` |

Two views do the heavy lifting:

- **`experience_summary`** flattens price, duration, rating, cover image, host
  and location into one queryable row. It exists because location is only
  reachable through `location_model.owner_id`, which has no foreign key, so
  PostgREST can't embed it. It also filters to
  `experience_status_code = 'published' AND deleted_at IS NULL` — RLS on
  `experiences` is `USING (true)`, so **drafts are readable from the table**.
  Query the view, never the table.
- **`host_profiles`** — public host detail.

Row Level Security is enabled on every user-owned table, with `auth.uid() =
user_id` policies for bookings, saved experiences, payment methods, booking
requests, reflections and stamps; public `SELECT` for the catalogue, slots and
reviews. Storage buckets exist for avatars and experience images with matching
policies.

### Correctness rules worth knowing

- **Capacity is enforced in Postgres, not in JS.** The
  `bookings_check_capacity` trigger takes a row lock and re-checks before every
  insert, so two people booking the last spot concurrently cannot both succeed.
  The service pre-checks only to produce a nicer message; the trigger is what
  makes it correct. Its exception maps to `409 slot_full`.
- **The server prices everything.** `POST /v1/bookings` prices from the slot's
  own `price_amount` plus the `promo_codes` table. Any total sent by a client is
  ignored. Cancellation fees come from `lib/refund.ts` (≥24h free · 2–24h 50% ·
  <2h non-refundable).
- **Money is THB as a plain number.** Postgres `decimal(10,2)` arrives from
  PostgREST as a *string*, so every price read goes through `toThb()`.
- **A reschedule is a cancel plus a rebook**, because the slot counter triggers
  only fire on insert and on cancellation. Those are two statements, not one
  transaction — if the rebook fails, the original stays cancelled.

### Endpoints (all under `/v1`, 🔒 = needs a caller)

Public: `GET /health`, `/catalog/filters`, `/catalog/discovery`,
`/experiences` (with `q`, categories, tags, duration, price, rating, sort,
cursor pagination), `/experiences/home`, `/experiences/:id`,
`/experiences/:id/slots`, `/:id/reviews`, `/:id/similar`, `/:id/more-from-host`,
`/bookings/quote`, `POST /promos/validate`.

Authenticated: 🔒 `GET|PATCH /me` · `/me/saved` (+ `PUT`/`DELETE`) ·
`/me/payment-methods` (+ add, set-default, delete) · `/me/bookings` ·
`POST /bookings` · `GET /bookings/:id` · `PATCH /bookings/:id` (reschedule) ·
`POST /bookings/:id/cancel` (returns the refund quote) · `POST /booking-requests`.

### Auth — two paths, both live

1. **Real:** `Authorization: Bearer <Supabase access token>`. The token is
   verified against Supabase Auth and `request.db` is a client carrying it, so
   **Postgres RLS decides what the caller can read and write**. `odys-customer`
   uses this path today via Google OAuth.
2. **Dev stub:** with no bearer token and `DEV_AUTH_USER_ID` set, the API acts
   as that user and `request.db` is the **service-role client, which bypasses
   RLS**. This is why services filter `.eq('user_id', user.id)` explicitly
   instead of trusting policies. Ignored when `NODE_ENV=production`.

Turning the stub off is a one-branch deletion in `src/plugins/auth.ts`; every
ownership check already holds on both paths.

### Scripts

- `npm run db:push` — apply migrations to the linked hosted project.
- `npm run db:seed` — idempotent. Creates the host and demo customer in
  `auth.users` (which migrations cannot do), plus reviews, per-experience
  content, FAQs and payment methods. Prints the id for `DEV_AUTH_USER_ID`.
- `npm run db:slots` — maintains a **rolling window** of future bookable slots.
  Must be re-run periodically or the booking calendar empties as slots age out.

## Not built yet

Payment processing (bookings record a chosen method; no money moves),
messaging (there are **no message tables** — the customer inbox is mock data),
notifications, and **any host/vendor write endpoints**.

---

## How this connects to the other repos

```
  odys-customer (:3000)                odys-vendor (:3001)
   React + React Query                  React + Tailwind
          │                                    │
          │ fetch /v1/*                        │ ✗ not connected
          │ Bearer <supabase jwt>              │   (in-memory mock)
          ▼                                    ╎
  ┌───────────────────────┐                    ╎
  │   odys-backend :8080  │  ◀╌╌╌╌ planned ╌╌╌╌╯
  │   Fastify  /v1        │
  └───────────┬───────────┘
              │ supabase-js (service-role · anon · per-user token)
              ▼
     Supabase: Postgres + RLS · Auth · Storage
              ▲
              │ supabase-js — auth only (Google OAuth session)
              │
        odys-customer
```

**To `odys-customer`** — fully connected. The customer app is the only consumer
of this API today. Two links, not one:

- *Data:* every screen goes through `odys-customer/src/lib/api/`, whose
  `client.js` is the single `fetch()` into `/v1`. `src/types/dto.ts` here is
  the contract those modules decode.
- *Auth:* the customer app talks to **Supabase directly** for Google OAuth
  only, then mirrors the access token into its API client. This backend
  verifies that token and hands the request an RLS-scoped DB client. The two
  apps must point at the same Supabase project — `SUPABASE_URL` here and
  `VITE_SUPABASE_URL` there.

CORS is the gate: `CORS_ORIGINS` must list the frontend origins
(`:3000` customer, `:3001` vendor).

**To `odys-vendor`** — not connected. The vendor app runs entirely on its own
in-memory mock and expects a different contract. Bridging it means reconciling
four mismatches, not just changing an origin:

| | odys-vendor expects | this backend has |
|---|---|---|
| Paths | `/vendor/*` | `/v1/*`, customer-shaped |
| Money | `priceMinor`, integer satang | THB `number` |
| Nouns | `sessions`, `instructors` | `experience_slots`; no instructors table |
| Status | `draft \| in_review \| approved \| rejected` | `draft \| submitted \| approved \| rejected \| archived \| published` |

Plus this API has **no host-side write endpoints at all** — a vendor cannot yet
create an experience, open a session, or reply to a review through it.

**The indirect link:** the six experiences a customer browses are seeded here by
migration `20260322000002_seed_experiences.sql`, owned by the host account
`seed.ts` creates. Those are the same records the vendor app *pretends* to own
in its mock. Connecting the vendor app is what closes the loop — vendor writes
a row, customer reads it, booking flows back.
