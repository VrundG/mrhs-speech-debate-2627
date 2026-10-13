CREATE TABLE IF NOT EXISTS permission_form_checks (
  tournament_id TEXT NOT NULL,
  student_name_key TEXT NOT NULL,
  member_id TEXT,
  student_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'emailed')),
  source_sheet TEXT NOT NULL,
  checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tournament_id, student_name_key)
);

CREATE INDEX IF NOT EXISTS idx_permission_form_checks_member
ON permission_form_checks(member_id);
