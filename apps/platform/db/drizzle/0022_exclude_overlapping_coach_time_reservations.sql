ALTER TABLE "app"."coach_time_reservations"
  ADD CONSTRAINT "coach_time_reservations_no_overlap"
  EXCLUDE USING gist (tstzrange("starts_at", "ends_at", '[)') WITH &&);
