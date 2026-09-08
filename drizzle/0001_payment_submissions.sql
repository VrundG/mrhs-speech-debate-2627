CREATE TABLE IF NOT EXISTS payment_submissions (
  id TEXT PRIMARY KEY,
  source_key TEXT NOT NULL UNIQUE,
  source_row INTEGER,
  form_timestamp TEXT NOT NULL,
  student_name_raw TEXT NOT NULL,
  member_id TEXT,
  matched_student_name TEXT,
  student_match_status TEXT NOT NULL CHECK (student_match_status IN ('matched', 'review', 'unmatched')),
  student_match_confidence REAL,
  payment_for TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  receipt_url TEXT,
  late_reason TEXT,
  tournament_name_raw TEXT,
  tournament_id TEXT,
  matched_tournament_name TEXT,
  tournament_match_status TEXT NOT NULL CHECK (tournament_match_status IN ('matched', 'review', 'not_applicable', 'unmatched')),
  tournament_match_confidence REAL,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_payment_submissions_member ON payment_submissions(member_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_payment_submissions_tournament ON payment_submissions(tournament_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_payment_submissions_timestamp ON payment_submissions(form_timestamp DESC);
