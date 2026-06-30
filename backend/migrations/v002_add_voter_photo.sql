DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'votes' AND column_name = 'voter_photo'
  ) THEN
    ALTER TABLE votes ADD COLUMN voter_photo VARCHAR(500);
  END IF;
END $$;
