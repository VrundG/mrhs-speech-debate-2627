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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);
