-- Restricciones de integridad y anti-solapamiento a nivel de base de datos.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Un barbero no puede tener dos citas activas que se solapen en el tiempo.
ALTER TABLE "Appointment"
  ADD CONSTRAINT "appointment_no_overlap"
  EXCLUDE USING gist (
    "barberId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("status" <> 'CANCELLED');

ALTER TABLE "Service"
  ADD CONSTRAINT "service_price_non_negative" CHECK ("priceCents" >= 0),
  ADD CONSTRAINT "service_duration_positive" CHECK ("durationMin" > 0),
  ADD CONSTRAINT "service_buffer_non_negative" CHECK ("bufferMin" >= 0);

ALTER TABLE "Appointment"
  ADD CONSTRAINT "appointment_end_after_start" CHECK ("endAt" > "startAt"),
  ADD CONSTRAINT "appointment_amounts_non_negative"
    CHECK ("totalCents" >= 0 AND "depositCents" >= 0 AND "amountDueCents" >= 0),
  ADD CONSTRAINT "appointment_deposit_lte_total" CHECK ("depositCents" <= "totalCents");

ALTER TABLE "Schedule"
  ADD CONSTRAINT "schedule_weekday_range" CHECK ("weekday" BETWEEN 0 AND 6),
  ADD CONSTRAINT "schedule_hours_valid" CHECK ("openMinute" >= 0 AND "closeMinute" <= 1440 AND "closeMinute" > "openMinute"),
  ADD CONSTRAINT "schedule_break_valid" CHECK (
    ("breakStartMinute" IS NULL AND "breakEndMinute" IS NULL)
    OR ("breakStartMinute" IS NOT NULL AND "breakEndMinute" IS NOT NULL
        AND "breakEndMinute" > "breakStartMinute")
  );

ALTER TABLE "BarberSchedule"
  ADD CONSTRAINT "barber_schedule_weekday_range" CHECK ("weekday" BETWEEN 0 AND 6),
  ADD CONSTRAINT "barber_schedule_hours_valid" CHECK ("startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute");

ALTER TABLE "Availability"
  ADD CONSTRAINT "availability_end_after_start" CHECK ("endAt" > "startAt");

ALTER TABLE "Payment"
  ADD CONSTRAINT "payment_amount_positive" CHECK ("amountCents" > 0);

ALTER TABLE "BusinessSettings"
  ADD CONSTRAINT "settings_deposit_percent_range" CHECK (
    ("depositType" <> 'PERCENT') OR ("depositValue" BETWEEN 0 AND 100)
  ),
  ADD CONSTRAINT "settings_advance_valid" CHECK ("minAdvanceMinutes" >= 0 AND "maxAdvanceDays" >= 1),
  ADD CONSTRAINT "settings_slot_interval" CHECK ("slotIntervalMin" BETWEEN 5 AND 60);
