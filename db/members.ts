import { env } from 'cloudflare:workers';
import {
  createMemberProfilesSeasonIndex,
  createMemberProfilesTable,
  createMembersNameIndex,
  createMembersTable,
} from './schema';
import { normalizePersonName } from '../app/lib/name-matcher';

export type TournamentHistory = { tournament: string; date: string | null };
export type AccountState = 'yes' | 'no' | 'unknown';

export type Member = {
  id: string;
  name: string;
  role: 'Student';
  memberType: 'Returning member' | 'New member';
  membershipFee: 45 | 65;
  membershipStatus: 'Paid' | 'Unpaid';
  eventHistory: string[];
  tournamentHistory: TournamentHistory[];
  activeSeason: string | null;
  graduationYear: string | null;
  schoolEmail: string | null;
  personalEmail: string | null;
  phoneNumber: string | null;
  parent1Name: string | null;
  parent1Email: string | null;
  parent1Phone: string | null;
  parent2Name: string | null;
  parent2Email: string | null;
  parent2Phone: string | null;
  priorExperience: boolean | null;
  priorEvents: string[];
  shirtSize: string | null;
  tabroomAccountCreated: AccountState;
  tabroomEmail: string | null;
  nsdaAccountCreated: AccountState;
  nsdaEmail: string | null;
  jbJwLinked: string | null;
  membershipFormTimestamp: string | null;
  accountSetupTimestamp: string | null;
};

type MemberRow = {
  id: string;
  name: string;
  role: Member['role'];
  member_type: Member['memberType'];
  membership_fee: Member['membershipFee'];
  membership_status: Member['membershipStatus'];
  event_history: string;
  tournament_history: string;
  active_season: string | null;
  graduation_year: string | null;
  school_email: string | null;
  personal_email: string | null;
  phone_number: string | null;
  parent_1_name: string | null;
  parent_1_email: string | null;
  parent_1_phone: string | null;
  parent_2_name: string | null;
  parent_2_email: string | null;
  parent_2_phone: string | null;
  prior_experience: number | null;
  prior_events: string | null;
  shirt_size: string | null;
  tabroom_account_created: AccountState | null;
  tabroom_email: string | null;
  nsda_account_created: AccountState | null;
  nsda_email: string | null;
  jb_jw_linked: string | null;
  membership_form_timestamp: string | null;
  account_setup_timestamp: string | null;
};

export type MembershipProfileInput = {
  activeSeason: string;
  graduationYear: string | null;
  schoolEmail: string | null;
  personalEmail: string | null;
  phoneNumber: string | null;
  parent1Name: string | null;
  parent1Email: string | null;
  parent1Phone: string | null;
  parent2Name: string | null;
  parent2Email: string | null;
  parent2Phone: string | null;
  priorExperience: boolean | null;
  priorEvents: string[];
  shirtSize: string | null;
  membershipFormTimestamp: string;
};

export type AccountSetupInput = {
  tabroomAccountCreated: AccountState;
  tabroomEmail: string | null;
  nsdaAccountCreated: AccountState;
  nsdaEmail: string | null;
  jbJwLinked: string | null;
  accountSetupTimestamp: string;
};

function database() {
  return (env as unknown as { DB: D1Database }).DB;
}

export async function ensureMembersSchema() {
  const db = database();
  await db.batch([
    db.prepare(createMembersTable),
    db.prepare(createMembersNameIndex),
    db.prepare(createMemberProfilesTable),
    db.prepare(createMemberProfilesSeasonIndex),
  ]);
  return db;
}

function parseStringList(value: string | null) {
  try {
    const parsed = JSON.parse(value ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function parseTournamentHistory(value: string): TournamentHistory[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): TournamentHistory[] => {
      if (!item || typeof item !== 'object') return [];
      const tournament = 'tournament' in item && typeof item.tournament === 'string' ? item.tournament : '';
      const date = 'date' in item && (typeof item.date === 'string' || item.date === null) ? item.date : null;
      return tournament ? [{ tournament, date }] : [];
    });
  } catch {
    return [];
  }
}

function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    memberType: row.member_type,
    membershipFee: row.membership_fee,
    membershipStatus: row.membership_status,
    eventHistory: parseStringList(row.event_history),
    tournamentHistory: parseTournamentHistory(row.tournament_history),
    activeSeason: row.active_season,
    graduationYear: row.graduation_year,
    schoolEmail: row.school_email,
    personalEmail: row.personal_email,
    phoneNumber: row.phone_number,
    parent1Name: row.parent_1_name,
    parent1Email: row.parent_1_email,
    parent1Phone: row.parent_1_phone,
    parent2Name: row.parent_2_name,
    parent2Email: row.parent_2_email,
    parent2Phone: row.parent_2_phone,
    priorExperience: row.prior_experience === null ? null : Boolean(row.prior_experience),
    priorEvents: parseStringList(row.prior_events),
    shirtSize: row.shirt_size,
    tabroomAccountCreated: row.tabroom_account_created ?? 'unknown',
    tabroomEmail: row.tabroom_email,
    nsdaAccountCreated: row.nsda_account_created ?? 'unknown',
    nsdaEmail: row.nsda_email,
    jbJwLinked: row.jb_jw_linked,
    membershipFormTimestamp: row.membership_form_timestamp,
    accountSetupTimestamp: row.account_setup_timestamp,
  };
}

export async function listMembers() {
  const db = await ensureMembersSchema();
  const result = await db.prepare(`
    SELECT m.id, m.name, m.role, m.member_type, m.membership_fee, m.membership_status,
      m.event_history, m.tournament_history, p.active_season, p.graduation_year,
      p.school_email, p.personal_email, p.phone_number, p.parent_1_name, p.parent_1_email,
      p.parent_1_phone, p.parent_2_name, p.parent_2_email, p.parent_2_phone,
      p.prior_experience, p.prior_events, p.shirt_size, p.tabroom_account_created,
      p.tabroom_email, p.nsda_account_created, p.nsda_email, p.jb_jw_linked,
      p.membership_form_timestamp, p.account_setup_timestamp
    FROM members m
    LEFT JOIN member_profiles p ON p.member_id = m.id
    ORDER BY m.name COLLATE NOCASE ASC
  `).all<MemberRow>();
  return result.results.map(toMember);
}

async function upsertMemberCore(db: D1Database, member: Pick<Member, 'id' | 'name' | 'role' | 'memberType' | 'membershipFee' | 'membershipStatus' | 'eventHistory' | 'tournamentHistory'>) {
  await db.prepare(
    'INSERT INTO members ' +
    '(id, name, normalized_name, role, member_type, membership_fee, membership_status, event_history, tournament_history) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ' +
    'ON CONFLICT(id) DO UPDATE SET ' +
    'name = excluded.name, normalized_name = excluded.normalized_name, role = excluded.role, ' +
    'member_type = excluded.member_type, membership_fee = excluded.membership_fee, ' +
    'membership_status = excluded.membership_status, event_history = excluded.event_history, ' +
    'tournament_history = excluded.tournament_history, updated_at = CURRENT_TIMESTAMP',
  ).bind(
    member.id,
    member.name,
    normalizePersonName(member.name),
    member.role,
    member.memberType,
    member.membershipFee,
    member.membershipStatus,
    JSON.stringify(member.eventHistory),
    JSON.stringify(member.tournamentHistory),
  ).run();
}

export async function upsertMembers(members: Member[]) {
  const db = await ensureMembersSchema();
  for (const member of members) await upsertMemberCore(db, member);
}

export async function saveMembershipSubmission(member: Member, profile: MembershipProfileInput) {
  const db = await ensureMembersSchema();
  await upsertMemberCore(db, member);
  await db.prepare(`
    INSERT INTO member_profiles (
      member_id, active_season, graduation_year, school_email, personal_email, phone_number,
      parent_1_name, parent_1_email, parent_1_phone, parent_2_name, parent_2_email,
      parent_2_phone, prior_experience, prior_events, shirt_size, membership_form_timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(member_id) DO UPDATE SET
      active_season = excluded.active_season, graduation_year = excluded.graduation_year,
      school_email = excluded.school_email, personal_email = excluded.personal_email,
      phone_number = excluded.phone_number, parent_1_name = excluded.parent_1_name,
      parent_1_email = excluded.parent_1_email, parent_1_phone = excluded.parent_1_phone,
      parent_2_name = excluded.parent_2_name, parent_2_email = excluded.parent_2_email,
      parent_2_phone = excluded.parent_2_phone, prior_experience = excluded.prior_experience,
      prior_events = excluded.prior_events, shirt_size = excluded.shirt_size,
      membership_form_timestamp = excluded.membership_form_timestamp, updated_at = CURRENT_TIMESTAMP
  `).bind(
    member.id,
    profile.activeSeason,
    profile.graduationYear,
    profile.schoolEmail,
    profile.personalEmail,
    profile.phoneNumber,
    profile.parent1Name,
    profile.parent1Email,
    profile.parent1Phone,
    profile.parent2Name,
    profile.parent2Email,
    profile.parent2Phone,
    profile.priorExperience === null ? null : Number(profile.priorExperience),
    JSON.stringify(profile.priorEvents),
    profile.shirtSize,
    profile.membershipFormTimestamp,
  ).run();
}

export async function saveAccountSetup(memberId: string, setup: AccountSetupInput) {
  const db = await ensureMembersSchema();
  await db.prepare(`
    INSERT INTO member_profiles (
      member_id, tabroom_account_created, tabroom_email, nsda_account_created,
      nsda_email, jb_jw_linked, account_setup_timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(member_id) DO UPDATE SET
      tabroom_account_created = excluded.tabroom_account_created,
      tabroom_email = excluded.tabroom_email,
      nsda_account_created = excluded.nsda_account_created,
      nsda_email = excluded.nsda_email,
      jb_jw_linked = excluded.jb_jw_linked,
      account_setup_timestamp = excluded.account_setup_timestamp,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    memberId,
    setup.tabroomAccountCreated,
    setup.tabroomEmail,
    setup.nsdaAccountCreated,
    setup.nsdaEmail,
    setup.jbJwLinked,
    setup.accountSetupTimestamp,
  ).run();
}

export async function markMemberMembershipPaid(memberId: string) {
  const db = await ensureMembersSchema();
  await db.prepare(
    "UPDATE members SET membership_status = 'Paid', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  ).bind(memberId).run();
}

export async function markActiveMemberReturning(memberId: string) {
  const db = await ensureMembersSchema();
  await db.prepare(`
    UPDATE members
    SET member_type = 'Returning member', membership_fee = 45, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND EXISTS (
        SELECT 1 FROM member_profiles p
        WHERE p.member_id = members.id AND p.active_season = '2026-27'
      )
  `).bind(memberId).run();
}
