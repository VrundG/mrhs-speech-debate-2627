CREATE TABLE IF NOT EXISTS member_profiles (
  member_id TEXT PRIMARY KEY,
  active_season TEXT,
  graduation_year TEXT,
  school_email TEXT,
  personal_email TEXT,
  phone_number TEXT,
  parent_1_name TEXT,
  parent_1_email TEXT,
  parent_1_phone TEXT,
  parent_2_name TEXT,
  parent_2_email TEXT,
  parent_2_phone TEXT,
  prior_experience INTEGER,
  prior_events TEXT NOT NULL DEFAULT '[]',
  shirt_size TEXT,
  tabroom_account_created TEXT NOT NULL DEFAULT 'unknown' CHECK (tabroom_account_created IN ('yes', 'no', 'unknown')),
  tabroom_email TEXT,
  nsda_account_created TEXT NOT NULL DEFAULT 'unknown' CHECK (nsda_account_created IN ('yes', 'no', 'unknown')),
  nsda_email TEXT,
  jb_jw_linked TEXT,
  membership_form_timestamp TEXT,
  account_setup_timestamp TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(member_id) REFERENCES members(id)
);

CREATE INDEX IF NOT EXISTS idx_member_profiles_active_season
ON member_profiles(active_season);
