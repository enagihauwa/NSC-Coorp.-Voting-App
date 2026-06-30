DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'votes' AND column_name = 'status'
  ) THEN
    ALTER TABLE votes ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
  END IF;
END $$;
