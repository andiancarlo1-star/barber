-- Replace legacy short, guessable public reservation codes. Related links in
-- notification bodies and receipts are updated to keep stored messages usable.
CREATE TEMP TABLE "_reservation_code_rotation" AS
SELECT
  "code" AS old_code,
  'NVJ-' || replace(gen_random_uuid()::text, '-', '') AS new_code
FROM "Appointment"
WHERE length("code") < 20;

ALTER TABLE "_reservation_code_rotation"
  ADD PRIMARY KEY (old_code),
  ADD UNIQUE (new_code);

UPDATE "Appointment" AS appointment
SET "code" = rotation.new_code
FROM "_reservation_code_rotation" AS rotation
WHERE appointment."code" = rotation.old_code;

UPDATE "Payment" AS payment
SET "receiptUrl" = replace(
  payment."receiptUrl",
  '/reserva/' || rotation.old_code,
  '/reserva/' || rotation.new_code
)
FROM "_reservation_code_rotation" AS rotation
WHERE payment."receiptUrl" LIKE '%/reserva/' || rotation.old_code || '%';

UPDATE "Notification" AS notification
SET "body" = replace(notification."body", rotation.old_code, rotation.new_code)
FROM "_reservation_code_rotation" AS rotation
WHERE notification."body" LIKE '%' || rotation.old_code || '%';

-- Seed payment references are deterministic and never represent gateway
-- transactions. Rotate them along with the demo reservation codes.
UPDATE "Payment" AS payment
SET
  "externalId" = 'NVJ-' || replace(gen_random_uuid()::text, '-', ''),
  "idempotencyKey" = 'seed-rotated-' || replace(gen_random_uuid()::text, '-', '')
FROM "_reservation_code_rotation" AS rotation
WHERE payment."externalId" = 'SEED-PAY-' || rotation.old_code;

DROP TABLE "_reservation_code_rotation";
