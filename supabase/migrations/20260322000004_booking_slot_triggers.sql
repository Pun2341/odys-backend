-- Keep experience_slots.booked_count in sync without service-role API calls.

CREATE OR REPLACE FUNCTION check_slot_capacity_before_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  slot_row experience_slots%ROWTYPE;
BEGIN
  SELECT * INTO slot_row FROM experience_slots WHERE id = NEW.slot_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found';
  END IF;
  IF slot_row.experience_id <> NEW.experience_id THEN
    RAISE EXCEPTION 'Slot does not belong to experience';
  END IF;
  IF slot_row.booked_count + NEW.guests > slot_row.capacity THEN
    RAISE EXCEPTION 'Not enough spots';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_check_capacity
BEFORE INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION check_slot_capacity_before_booking();

CREATE OR REPLACE FUNCTION increment_slot_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE experience_slots
  SET
    booked_count = booked_count + NEW.guests,
    status = CASE
      WHEN booked_count + NEW.guests >= capacity THEN 'full'
      ELSE status
    END
  WHERE id = NEW.slot_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_increment_slot
AFTER INSERT ON bookings
FOR EACH ROW
WHEN (NEW.status IN ('pending', 'booked'))
EXECUTE FUNCTION increment_slot_on_booking();

CREATE OR REPLACE FUNCTION decrement_slot_on_booking_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
    UPDATE experience_slots
    SET
      booked_count = GREATEST(0, booked_count - OLD.guests),
      status = CASE
        WHEN status = 'full' AND booked_count - OLD.guests < capacity THEN 'open'
        ELSE status
      END
    WHERE id = OLD.slot_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_decrement_slot_on_cancel
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION decrement_slot_on_booking_cancel();
