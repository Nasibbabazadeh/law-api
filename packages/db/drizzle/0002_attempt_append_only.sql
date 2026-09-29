-- `attempt` is an append-only log: rows may be inserted (and removed with their user),
-- but never modified. Derived state lives in `review_item`.
CREATE OR REPLACE FUNCTION attempt_reject_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'attempt rows are append-only (id %)', OLD.id
    USING ERRCODE = 'restrict_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER attempt_append_only
  BEFORE UPDATE ON "attempt"
  FOR EACH ROW EXECUTE FUNCTION attempt_reject_update();
