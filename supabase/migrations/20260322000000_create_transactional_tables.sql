-- Transactional tables: slots, bookings, booking requests, reviews

CREATE TABLE experience_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  mode varchar NOT NULL CHECK (mode IN ('group', 'private')),
  capacity int NOT NULL CHECK (capacity > 0),
  booked_count int NOT NULL DEFAULT 0 CHECK (booked_count >= 0),
  price_amount decimal(10,2) NOT NULL CHECK (price_amount >= 0),
  currency varchar NOT NULL DEFAULT 'THB',
  status varchar NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_booked_within_capacity CHECK (booked_count <= capacity)
);

CREATE INDEX idx_experience_slots_experience ON experience_slots(experience_id);
CREATE INDEX idx_experience_slots_starts_at ON experience_slots(starts_at);

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  experience_id uuid NOT NULL REFERENCES experiences(id),
  slot_id uuid NOT NULL REFERENCES experience_slots(id),
  mode varchar NOT NULL CHECK (mode IN ('group', 'private', 'custom')),
  guests int NOT NULL CHECK (guests >= 1),
  subtotal_thb decimal(10,2) NOT NULL,
  tax_thb decimal(10,2) NOT NULL DEFAULT 0,
  total_thb decimal(10,2) NOT NULL,
  status varchar NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'booked', 'experienced', 'cancelled')),
  payment_intent_id text,
  preparation_note text,
  cancelled_at timestamptz,
  -- Dedup guard for appointment reminder emails. Null = not yet reminded; the
  -- cron route stamps it right after a successful send, so a booking is never
  -- reminded twice even if the job overlaps or retries.
  reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_slot ON bookings(slot_id);

CREATE INDEX idx_bookings_reminder_lookup
  ON bookings (status, reminder_sent_at)
  WHERE status = 'booked' AND reminder_sent_at IS NULL;

CREATE TABLE booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  experience_id uuid NOT NULL REFERENCES experiences(id),
  event_type varchar NOT NULL,
  date_from date,
  date_to date,
  preferred_time varchar,
  location varchar,
  attendees int,
  notes text,
  status varchar NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_requests_user ON booking_requests(user_id);

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  experience_id uuid NOT NULL REFERENCES experiences(id),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_experience ON reviews(experience_id);

-- RLS
ALTER TABLE experience_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Slots: public read for open slots
CREATE POLICY "slots_select_open" ON experience_slots
  FOR SELECT USING (status = 'open' OR status = 'full');

-- Bookings: users read/write own
CREATE POLICY "bookings_select_own" ON bookings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bookings_insert_own" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookings_update_own" ON bookings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "booking_requests_select_own" ON booking_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "booking_requests_insert_own" ON booking_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_select_all" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_own" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grants for new tables
GRANT SELECT ON experience_slots TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON bookings TO authenticated;
GRANT SELECT, INSERT ON booking_requests TO authenticated;
GRANT SELECT, INSERT ON reviews TO anon, authenticated;
