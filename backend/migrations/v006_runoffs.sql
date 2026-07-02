-- Runoff (re-run) elections for tied positions.
-- A runoff reopens voting for only the tied candidates of a single position for a
-- bounded time window. Runoffs are chainable: a runoff that closes still tied can
-- spawn another round. Round 1 = the main election; runoff rounds start at 2.

CREATE TABLE IF NOT EXISTS runoffs (
  id SERIAL PRIMARY KEY,
  position_id INTEGER REFERENCES positions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,              -- 2 = first runoff (round 1 = main election), 3, 4, ...
  status VARCHAR(20) DEFAULT 'open',          -- 'open' | 'closed'
  start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time   TIMESTAMP NOT NULL,
  created_by INTEGER REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- At most one OPEN runoff per position at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_runoff_open_position
  ON runoffs(position_id) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS runoff_candidates (
  id SERIAL PRIMARY KEY,
  runoff_id    INTEGER REFERENCES runoffs(id) ON DELETE CASCADE,
  candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  UNIQUE(runoff_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS runoff_votes (
  id SERIAL PRIMARY KEY,
  runoff_id    INTEGER REFERENCES runoffs(id) ON DELETE CASCADE,
  member_id    INTEGER REFERENCES members(id) ON DELETE CASCADE,
  candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  location     VARCHAR(200),
  voter_photo  VARCHAR(500),
  status       VARCHAR(20) DEFAULT 'pending',  -- 'pending' | 'verified' | 'rejected'
  rejection_reason TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(runoff_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_runoff_votes_runoff ON runoff_votes(runoff_id);
CREATE INDEX IF NOT EXISTS idx_runoffs_position ON runoffs(position_id);
