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
    confirmed_tournament_names TEXT,
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

export const createLoginAttemptsTable = `
  CREATE TABLE IF NOT EXISTS login_attempts (
    fingerprint TEXT PRIMARY KEY,
    failed_count INTEGER NOT NULL DEFAULT 0,
    window_started_at INTEGER NOT NULL,
    blocked_until INTEGER,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

export const createMembersTable = `
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role = 'Student'),
    member_type TEXT NOT NULL CHECK (member_type IN ('Returning member', 'New member')),
    membership_fee INTEGER NOT NULL CHECK (membership_fee IN (45, 65)),
    membership_status TEXT NOT NULL CHECK (membership_status IN ('Paid', 'Unpaid')),
    event_history TEXT NOT NULL DEFAULT '[]',
    tournament_history TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

export const createMembersNameIndex = `
  CREATE INDEX IF NOT EXISTS idx_members_name
  ON members(name)
`;
