DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'votes' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE votes ADD COLUMN rejection_reason VARCHAR(500);
  END IF;
END $$;
