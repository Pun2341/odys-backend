-- Promo codes for the checkout screen.

CREATE TABLE promo_codes (
  code varchar PRIMARY KEY,
  description varchar,
  discount_type varchar NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value decimal(10,2) NOT NULL CHECK (discount_value > 0),
  currency varchar NOT NULL DEFAULT 'THB',
  min_subtotal_thb decimal(10,2) NOT NULL DEFAULT 0 CHECK (min_subtotal_thb >= 0),
  max_discount_thb decimal(10,2) CHECK (max_discount_thb IS NULL OR max_discount_thb > 0),
  is_active boolean NOT NULL DEFAULT true,
  valid_from timestamptz,
  valid_to timestamptz,
  max_redemptions int CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  redeemed_count int NOT NULL DEFAULT 0 CHECK (redeemed_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_percent_within_100
    CHECK (discount_type <> 'percent' OR discount_value <= 100)
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Readable so the app can validate a typed code. Redemption counting is a
-- service-role write — there is deliberately no INSERT/UPDATE policy here.
CREATE POLICY "promo_codes_select_active" ON promo_codes
  FOR SELECT USING (is_active);

GRANT SELECT ON promo_codes TO anon, authenticated;

ALTER TABLE bookings
  ADD COLUMN promo_code varchar REFERENCES promo_codes(code) ON DELETE SET NULL,
  ADD COLUMN discount_thb decimal(10,2) NOT NULL DEFAULT 0 CHECK (discount_thb >= 0);

INSERT INTO promo_codes (code, description, discount_type, discount_value, min_subtotal_thb)
VALUES ('WELCOME10', '10% off your first experience', 'percent', 10, 0)
ON CONFLICT (code) DO NOTHING;
