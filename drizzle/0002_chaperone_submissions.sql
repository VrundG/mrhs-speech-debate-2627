CREATE TABLE IF NOT EXISTS chaperone_submissions (
  id TEXT PRIMARY KEY,
  source_key TEXT NOT NULL UNIQUE,
  source_row INTEGER,
  form_timestamp TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  student_name_raw TEXT NOT NULL,
  member_id TEXT,
  matched_student_name TEXT,
  student_match_status TEXT NOT NULL CHECK (student_match_status IN ('matched', 'review', 'unmatched')),
  student_match_confidence REAL,
  tournament_names TEXT,
  approved_volunteer TEXT NOT NULL CHECK (approved_volunteer IN ('yes', 'no', 'unknown')),
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chaperone_submissions_member
ON chaperone_submissions(member_id);

CREATE INDEX IF NOT EXISTS idx_chaperone_submissions_timestamp
ON chaperone_submissions(form_timestamp DESC);
