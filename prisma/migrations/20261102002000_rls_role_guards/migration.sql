-- Defense in depth: GUC values must never grant access without the matching role.
DROP POLICY IF EXISTS "user_self_select" ON "User";
DROP POLICY IF EXISTS "user_self_update" ON "User";
DROP POLICY IF EXISTS "customer_self_select" ON "Customer";
DROP POLICY IF EXISTS "customer_self_update" ON "Customer";
DROP POLICY IF EXISTS "barber_self_select" ON "Barber";
DROP POLICY IF EXISTS "barber_self_update" ON "Barber";

CREATE POLICY "user_self_select" ON "User" FOR SELECT TO navaja_app
  USING (
    app.current_user_role() IN ('CUSTOMER', 'BARBER')
    AND id = app.current_user_id()
  );

CREATE POLICY "user_self_update" ON "User" FOR UPDATE TO navaja_app
  USING (
    app.current_user_role() IN ('CUSTOMER', 'BARBER')
    AND id = app.current_user_id()
  )
  WITH CHECK (
    app.current_user_role() IN ('CUSTOMER', 'BARBER')
    AND id = app.current_user_id()
  );

CREATE POLICY "customer_self_select" ON "Customer" FOR SELECT TO navaja_app
  USING (
    app.current_user_role() = 'CUSTOMER'
    AND (id = app.current_customer_id() OR "userId" = app.current_user_id())
  );

CREATE POLICY "customer_self_update" ON "Customer" FOR UPDATE TO navaja_app
  USING (
    app.current_user_role() = 'CUSTOMER'
    AND "userId" = app.current_user_id()
  )
  WITH CHECK (
    app.current_user_role() = 'CUSTOMER'
    AND "userId" = app.current_user_id()
  );

CREATE POLICY "barber_self_select" ON "Barber" FOR SELECT TO navaja_app
  USING (
    app.current_user_role() = 'BARBER'
    AND "userId" = app.current_user_id()
  );

CREATE POLICY "barber_self_update" ON "Barber" FOR UPDATE TO navaja_app
  USING (
    app.current_user_role() = 'BARBER'
    AND "userId" = app.current_user_id()
  )
  WITH CHECK (
    app.current_user_role() = 'BARBER'
    AND "userId" = app.current_user_id()
  );
