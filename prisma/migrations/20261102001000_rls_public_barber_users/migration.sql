-- Public catalog needs the display name of active barbers.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_public_barber_select" ON "User" FOR SELECT TO navaja_app
  USING (
    app.current_user_role() IN ('ANON', 'CUSTOMER')
    AND EXISTS (
      SELECT 1 FROM "Barber" barber
      WHERE barber."userId" = "User".id
        AND barber.active
        AND barber."acceptsBookings"
    )
  );
