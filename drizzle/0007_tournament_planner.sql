ALTER TABLE chaperone_submissions ADD COLUMN parent_email TEXT;
ALTER TABLE chaperone_submissions ADD COLUMN parent_phone TEXT;
ALTER TABLE chaperone_submissions ADD COLUMN desired_event TEXT;
ALTER TABLE chaperone_submissions ADD COLUMN transport TEXT;

CREATE TABLE IF NOT EXISTS intent_submissions (
  id TEXT PRIMARY KEY, source_key TEXT NOT NULL UNIQUE, source_row INTEGER, form_timestamp TEXT NOT NULL,
  student_name_raw TEXT NOT NULL, member_id TEXT, matched_student_name TEXT,
  student_match_status TEXT NOT NULL CHECK (student_match_status IN ('matched','review','unmatched')), student_match_confidence REAL,
  tournament_name_raw TEXT NOT NULL, tournament_id TEXT, matched_tournament_name TEXT,
  tournament_match_status TEXT NOT NULL CHECK (tournament_match_status IN ('matched','review','unmatched')), tournament_match_confidence REAL,
  event_raw TEXT NOT NULL, event_category TEXT NOT NULL CHECK (event_category IN ('ld','pf','speech','congress','other')), event_details TEXT,
  tabroom_email TEXT, student_phone TEXT, parent_1_name TEXT, parent_1_email TEXT, parent_1_phone TEXT, parent_1_judging INTEGER NOT NULL DEFAULT 0,
  parent_2_name TEXT, parent_2_email TEXT, parent_2_phone TEXT, parent_2_judging INTEGER NOT NULL DEFAULT 0,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_intent_submissions_tournament ON intent_submissions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_intent_submissions_member ON intent_submissions(member_id);
CREATE TABLE IF NOT EXISTS tournament_plans (
  tournament_id TEXT PRIMARY KEY, judge_assignments TEXT NOT NULL DEFAULT '{}', student_statuses TEXT NOT NULL DEFAULT '{}',
  confirmed INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
