export const createPaymentSubmissionsTable = `
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
  )
`;

export const createPaymentMemberIndex = `
  CREATE INDEX IF NOT EXISTS idx_payment_submissions_member
  ON payment_submissions(member_id)
`;

export const createPaymentTournamentIndex = `
  CREATE INDEX IF NOT EXISTS idx_payment_submissions_tournament
  ON payment_submissions(tournament_id)
`;

export const createPaymentTimestampIndex = `
  CREATE INDEX IF NOT EXISTS idx_payment_submissions_timestamp
  ON payment_submissions(form_timestamp DESC)
`;

export const createChaperoneSubmissionsTable = `
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
  )
`;

export const createChaperoneMemberIndex = `
  CREATE INDEX IF NOT EXISTS idx_chaperone_submissions_member
  ON chaperone_submissions(member_id)
`;

export const createChaperoneTimestampIndex = `
  CREATE INDEX IF NOT EXISTS idx_chaperone_submissions_timestamp
  ON chaperone_submissions(form_timestamp DESC)
`;
