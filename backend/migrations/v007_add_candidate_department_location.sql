-- Add department and location columns to candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS department VARCHAR(200);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS location VARCHAR(200);

-- Add unique constraint on position_id + fullname to prevent duplicate candidates
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_position_id_fullname_key;
ALTER TABLE candidates ADD CONSTRAINT candidates_position_id_fullname_key UNIQUE (position_id, fullname);
