ALTER TABLE "OperationalProjection" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION prevent_operational_event_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'OperationalEvent is append-only and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS operational_event_no_update ON "OperationalEvent";
DROP TRIGGER IF EXISTS operational_event_no_delete ON "OperationalEvent";

CREATE TRIGGER operational_event_no_update
BEFORE UPDATE ON "OperationalEvent"
FOR EACH ROW EXECUTE FUNCTION prevent_operational_event_mutation();

CREATE TRIGGER operational_event_no_delete
BEFORE DELETE ON "OperationalEvent"
FOR EACH ROW EXECUTE FUNCTION prevent_operational_event_mutation();
