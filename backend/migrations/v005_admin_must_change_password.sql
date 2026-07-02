DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'must_change_password'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
