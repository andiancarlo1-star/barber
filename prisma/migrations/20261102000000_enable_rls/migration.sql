-- Row Level Security for Navaja Barber Studio.
-- The application connects with a non-owner role (navaja_app); migrations and
-- seed run with the owner role, which bypasses RLS unless FORCE is enabled.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'navaja_app') THEN
    CREATE ROLE navaja_app NOLOGIN;
  END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_user_role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('app.user_role', true), ''), 'ANON')
$$;

CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')
$$;

CREATE OR REPLACE FUNCTION app.current_customer_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.customer_id', true), '')
$$;

CREATE OR REPLACE FUNCTION app.current_barber_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.barber_id', true), '')
$$;

GRANT USAGE ON SCHEMA app TO navaja_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO navaja_app;
GRANT USAGE ON SCHEMA public TO navaja_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO navaja_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO navaja_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO navaja_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO navaja_app;

-- User ---------------------------------------------------------------
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_admin_all" ON "User" FOR ALL TO navaja_app
  USING (app.current_user_role() IN ('ADMIN', 'SYSTEM'))
  WITH CHECK (app.current_user_role() IN ('ADMIN', 'SYSTEM'));
CREATE POLICY "user_self_select" ON "User" FOR SELECT TO navaja_app
  USING (id = app.current_user_id());
CREATE POLICY "user_self_update" ON "User" FOR UPDATE TO navaja_app
  USING (id = app.current_user_id())
  WITH CHECK (id = app.current_user_id());

-- Customer -----------------------------------------------------------
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_admin_all" ON "Customer" FOR ALL TO navaja_app
  USING (app.current_user_role() IN ('ADMIN', 'SYSTEM'))
  WITH CHECK (app.current_user_role() IN ('ADMIN', 'SYSTEM'));
CREATE POLICY "customer_self_select" ON "Customer" FOR SELECT TO navaja_app
  USING (id = app.current_customer_id() OR "userId" = app.current_user_id());
CREATE POLICY "customer_self_update" ON "Customer" FOR UPDATE TO navaja_app
  USING ("userId" = app.current_user_id())
  WITH CHECK ("userId" = app.current_user_id());
CREATE POLICY "customer_barber_select" ON "Customer" FOR SELECT TO navaja_app
  USING (
    app.current_user_role() = 'BARBER'
    AND EXISTS (
      SELECT 1 FROM "Appointment" appointment
      WHERE appointment."customerId" = "Customer".id
        AND appointment."barberId" = app.current_barber_id()
    )
  );

-- Barber -------------------------------------------------------------
ALTER TABLE "Barber" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "barber_admin_all" ON "Barber" FOR ALL TO navaja_app
  USING (app.current_user_role() IN ('ADMIN', 'SYSTEM'))
  WITH CHECK (app.current_user_role() IN ('ADMIN', 'SYSTEM'));
CREATE POLICY "barber_public_select" ON "Barber" FOR SELECT TO navaja_app
  USING (
    app.current_user_role() IN ('ANON', 'CUSTOMER')
    AND active
    AND "acceptsBookings"
  );
CREATE POLICY "barber_self_select" ON "Barber" FOR SELECT TO navaja_app
  USING ("userId" = app.current_user_id());
CREATE POLICY "barber_self_update" ON "Barber" FOR UPDATE TO navaja_app
  USING ("userId" = app.current_user_id())
  WITH CHECK ("userId" = app.current_user_id());

-- Service ------------------------------------------------------------
ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_admin_all" ON "Service" FOR ALL TO navaja_app
  USING (app.current_user_role() IN ('ADMIN', 'SYSTEM'))
  WITH CHECK (app.current_user_role() IN ('ADMIN', 'SYSTEM'));
CREATE POLICY "service_public_select" ON "Service" FOR SELECT TO navaja_app
  USING (
    app.current_user_role() IN ('CUSTOMER', 'BARBER')
    OR (app.current_user_role() = 'ANON' AND active)
  );

-- Schedule -----------------------------------------------------------
ALTER TABLE "Schedule" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedule_admin_all" ON "Schedule" FOR ALL TO navaja_app
  USING (app.current_user_role() IN ('ADMIN', 'SYSTEM'))
  WITH CHECK (app.current_user_role() IN ('ADMIN', 'SYSTEM'));
CREATE POLICY "schedule_public_select" ON "Schedule" FOR SELECT TO navaja_app
  USING (
    app.current_user_role() IN ('ANON', 'CUSTOMER', 'BARBER')
    AND active
  );

-- BarberSchedule -----------------------------------------------------
ALTER TABLE "BarberSchedule" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "barber_schedule_admin_all" ON "BarberSchedule" FOR ALL TO navaja_app
  USING (app.current_user_role() IN ('ADMIN', 'SYSTEM'))
  WITH CHECK (app.current_user_role() IN ('ADMIN', 'SYSTEM'));
CREATE POLICY "barber_schedule_public_select" ON "BarberSchedule" FOR SELECT TO navaja_app
  USING (
    app.current_user_role() IN ('ANON', 'CUSTOMER', 'BARBER')
    AND active
  );
CREATE POLICY "barber_schedule_self_all" ON "BarberSchedule" FOR ALL TO navaja_app
  USING (
    app.current_user_role() = 'BARBER'
    AND "barberId" = app.current_barber_id()
  )
  WITH CHECK (
    app.current_user_role() = 'BARBER'
    AND "barberId" = app.current_barber_id()
  );

-- Availability -------------------------------------------------------
ALTER TABLE "Availability" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "availability_admin_all" ON "Availability" FOR ALL TO navaja_app
  USING (app.current_user_role() IN ('ADMIN', 'SYSTEM'))
  WITH CHECK (app.current_user_role() IN ('ADMIN', 'SYSTEM'));
CREATE POLICY "availability_barber_all" ON "Availability" FOR ALL TO navaja_app
  USING (
    app.current_user_role() = 'BARBER'
    AND "barberId" = app.current_barber_id()
  )
  WITH CHECK (
    app.current_user_role() = 'BARBER'
    AND "barberId" = app.current_barber_id()
  );

-- Appointment --------------------------------------------------------
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointment_admin_all" ON "Appointment" FOR ALL TO navaja_app
  USING (app.current_user_role() IN ('ADMIN', 'SYSTEM'))
  WITH CHECK (app.current_user_role() IN ('ADMIN', 'SYSTEM'));
CREATE POLICY "appointment_customer_select" ON "Appointment" FOR SELECT TO navaja_app
  USING (
    app.current_user_role() = 'CUSTOMER'
    AND "customerId" = app.current_customer_id()
  );
CREATE POLICY "appointment_barber_select" ON "Appointment" FOR SELECT TO navaja_app
  USING (
    app.current_user_role() = 'BARBER'
    AND "barberId" = app.current_barber_id()
  );
CREATE POLICY "appointment_barber_update" ON "Appointment" FOR UPDATE TO navaja_app
  USING (
    app.current_user_role() = 'BARBER'
    AND "barberId" = app.current_barber_id()
  )
  WITH CHECK (
    app.current_user_role() = 'BARBER'
    AND "barberId" = app.current_barber_id()
  );

-- Payment ------------------------------------------------------------
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_admin_all" ON "Payment" FOR ALL TO navaja_app
  USING (app.current_user_role() IN ('ADMIN', 'SYSTEM'))
  WITH CHECK (app.current_user_role() IN ('ADMIN', 'SYSTEM'));
CREATE POLICY "payment_customer_select" ON "Payment" FOR SELECT TO navaja_app
  USING (
    app.current_user_role() = 'CUSTOMER'
    AND EXISTS (
      SELECT 1 FROM "Appointment" appointment
      WHERE appointment.id = "Payment"."appointmentId"
        AND appointment."customerId" = app.current_customer_id()
    )
  );
CREATE POLICY "payment_barber_select" ON "Payment" FOR SELECT TO navaja_app
  USING (
    app.current_user_role() = 'BARBER'
    AND EXISTS (
      SELECT 1 FROM "Appointment" appointment
      WHERE appointment.id = "Payment"."appointmentId"
        AND appointment."barberId" = app.current_barber_id()
    )
  );

-- PaymentEvent -------------------------------------------------------
ALTER TABLE "PaymentEvent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_event_admin_all" ON "PaymentEvent" FOR ALL TO navaja_app
  USING (app.current_user_role() IN ('ADMIN', 'SYSTEM'))
  WITH CHECK (app.current_user_role() IN ('ADMIN', 'SYSTEM'));

-- Notification -------------------------------------------------------
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_admin_all" ON "Notification" FOR ALL TO navaja_app
  USING (app.current_user_role() IN ('ADMIN', 'SYSTEM'))
  WITH CHECK (app.current_user_role() IN ('ADMIN', 'SYSTEM'));
CREATE POLICY "notification_customer_select" ON "Notification" FOR SELECT TO navaja_app
  USING (
    app.current_user_role() = 'CUSTOMER'
    AND "customerId" = app.current_customer_id()
  );
CREATE POLICY "notification_barber_select" ON "Notification" FOR SELECT TO navaja_app
  USING (
    app.current_user_role() = 'BARBER'
    AND EXISTS (
      SELECT 1 FROM "Appointment" appointment
      WHERE appointment.id = "Notification"."appointmentId"
        AND appointment."barberId" = app.current_barber_id()
    )
  );

-- BusinessSettings ---------------------------------------------------
ALTER TABLE "BusinessSettings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_admin_all" ON "BusinessSettings" FOR ALL TO navaja_app
  USING (app.current_user_role() IN ('ADMIN', 'SYSTEM'))
  WITH CHECK (app.current_user_role() IN ('ADMIN', 'SYSTEM'));
CREATE POLICY "settings_public_select" ON "BusinessSettings" FOR SELECT TO navaja_app
  USING (app.current_user_role() IN ('ANON', 'CUSTOMER', 'BARBER'));

-- AuditLog -----------------------------------------------------------
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_admin_all" ON "AuditLog" FOR ALL TO navaja_app
  USING (app.current_user_role() IN ('ADMIN', 'SYSTEM'))
  WITH CHECK (app.current_user_role() IN ('ADMIN', 'SYSTEM'));
CREATE POLICY "audit_staff_insert" ON "AuditLog" FOR INSERT TO navaja_app
  WITH CHECK (app.current_user_role() IN ('ADMIN', 'BARBER'));
