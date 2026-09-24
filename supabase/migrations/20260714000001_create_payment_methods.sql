-- Saved payment methods.
--
-- Display metadata ONLY. No PAN, no CVV, no expiry — those belong to the payment
-- processor, and `provider_ref` is the handle it gives us. Nothing here is
-- sufficient to charge a card.

CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind varchar NOT NULL CHECK (kind IN ('card', 'apple', 'google', 'promptpay')),
  brand varchar,
  label varchar NOT NULL,
  last4 varchar CHECK (last4 IS NULL OR last4 ~ '^[0-9]{4}$'),
  provider_ref text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id, created_at);

-- At most one default per user.
CREATE UNIQUE INDEX uq_payment_methods_default
  ON payment_methods(user_id) WHERE is_default;

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods_select_own" ON payment_methods
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payment_methods_insert_own" ON payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payment_methods_update_own" ON payment_methods
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "payment_methods_delete_own" ON payment_methods
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON payment_methods TO authenticated;

-- Link a booking to the method it was paid with (display only).
ALTER TABLE bookings
  ADD COLUMN payment_method_id uuid REFERENCES payment_methods(id) ON DELETE SET NULL;
