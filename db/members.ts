import { env } from 'cloudflare:workers';
import { createMembersNameIndex, createMembersTable } from './schema';
import { normalizePersonName } from '../app/lib/name-matcher';

export type TournamentHistory = { tournament: string; date: string | null };

export type Member = {
  id: string;
  name: string;
  role: 'Student';
  memberType: 'Returning member' | 'New member';
  membershipFee: 45 | 65;
  membershipStatus: 'Paid' | 'Unpaid';
  eventHistory: string[];
  tournamentHistory: TournamentHistory[];
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
};

function database() {
  return (env as unknown as { DB: D1Database }).DB;
}

export async function ensureMembersSchema() {
  const db = database();
  await db.batch([
    db.prepare(createMembersTable),
    db.prepare(createMembersNameIndex),
  ]);
  return db;
}

function parseStringList(value: string) {
  try {
    const parsed = JSON.parse(value);
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
  };
}

export async function listMembers() {
  const db = await ensureMembersSchema();
  const result = await db.prepare(`
    SELECT id, name, role, member_type, membership_fee, membership_status,
      event_history, tournament_history
    FROM members
    ORDER BY name COLLATE NOCASE ASC
  `).all<MemberRow>();
  return result.results.map(toMember);
}

export async function upsertMembers(members: Member[]) {
  const db = await ensureMembersSchema();
  for (let offset = 0; offset < members.length; offset += 50) {
    const statements = members.slice(offset, offset + 50).map((member) => db.prepare(
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
    ));
    await db.batch(statements);
  }
}
