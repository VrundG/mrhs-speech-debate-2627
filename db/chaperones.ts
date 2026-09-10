import { env } from 'cloudflare:workers';
import {
  createChaperoneMemberIndex,
  createChaperoneSubmissionsTable,
  createChaperoneTimestampIndex,
} from './schema';

export type ChaperoneSubmission = {
  id: string;
  sourceRow: number | null;
  formTimestamp: string;
  parentName: string;
  studentNameRaw: string;
  memberId: string | null;
  matchedStudentName: string | null;
  studentMatchStatus: 'matched' | 'review' | 'unmatched';
  studentMatchConfidence: number | null;
  tournamentNames: string[];
  approvedVolunteer: 'yes' | 'no' | 'unknown';
  receivedAt: string;
};

type ChaperoneRow = {
  id: string;
  source_row: number | null;
  form_timestamp: string;
  parent_name: string;
  student_name_raw: string;
  member_id: string | null;
  matched_student_name: string | null;
  student_match_status: ChaperoneSubmission['studentMatchStatus'];
  student_match_confidence: number | null;
  tournament_names: string | null;
  approved_volunteer: ChaperoneSubmission['approvedVolunteer'];
  received_at: string;
};

function database() {
  return (env as unknown as { DB: D1Database }).DB;
}

export async function ensureChaperoneSchema() {
  const db = database();
  await db.batch([
    db.prepare(createChaperoneSubmissionsTable),
    db.prepare(createChaperoneMemberIndex),
    db.prepare(createChaperoneTimestampIndex),
  ]);
  return db;
}

function toChaperone(row: ChaperoneRow): ChaperoneSubmission {
  let tournamentNames: string[] = [];
  try {
    const parsed = row.tournament_names ? JSON.parse(row.tournament_names) : [];
    if (Array.isArray(parsed)) tournamentNames = parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    tournamentNames = [];
  }
  return {
    id: row.id,
    sourceRow: row.source_row,
    formTimestamp: row.form_timestamp,
    parentName: row.parent_name,
    studentNameRaw: row.student_name_raw,
    memberId: row.member_id,
    matchedStudentName: row.matched_student_name,
    studentMatchStatus: row.student_match_status,
    studentMatchConfidence: row.student_match_confidence,
    tournamentNames,
    approvedVolunteer: row.approved_volunteer,
    receivedAt: row.received_at,
  };
}

export async function listChaperoneSubmissions(limit = 1000) {
  const db = await ensureChaperoneSchema();
  const result = await db.prepare(`
    SELECT id, source_row, form_timestamp, parent_name, student_name_raw, member_id,
      matched_student_name, student_match_status, student_match_confidence,
      tournament_names, approved_volunteer, received_at
    FROM chaperone_submissions
    ORDER BY form_timestamp DESC, received_at DESC
    LIMIT ?
  `).bind(limit).all<ChaperoneRow>();
  return result.results.map(toChaperone);
}

export type SaveChaperoneInput = Omit<ChaperoneSubmission, 'receivedAt' | 'sourceRow'> & {
  sourceKey: string;
  sourceRow: number | null;
};

export async function saveChaperoneSubmissions(inputs: SaveChaperoneInput[]) {
  const db = await ensureChaperoneSchema();
  for (let offset = 0; offset < inputs.length; offset += 50) {
    const statements = inputs.slice(offset, offset + 50).map((input) => db.prepare(
      'INSERT INTO chaperone_submissions ' +
      '(id, source_key, source_row, form_timestamp, parent_name, student_name_raw, member_id, matched_student_name, student_match_status, student_match_confidence, tournament_names, approved_volunteer) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ' +
      'ON CONFLICT(source_key) DO UPDATE SET ' +
      'source_row = excluded.source_row, form_timestamp = excluded.form_timestamp, parent_name = excluded.parent_name, ' +
      'student_name_raw = excluded.student_name_raw, member_id = excluded.member_id, matched_student_name = excluded.matched_student_name, ' +
      'student_match_status = excluded.student_match_status, student_match_confidence = excluded.student_match_confidence, ' +
      'tournament_names = excluded.tournament_names, approved_volunteer = excluded.approved_volunteer, updated_at = CURRENT_TIMESTAMP',
    ).bind(
      input.id,
      input.sourceKey,
      input.sourceRow,
      input.formTimestamp,
      input.parentName,
      input.studentNameRaw,
      input.memberId,
      input.matchedStudentName,
      input.studentMatchStatus,
      input.studentMatchConfidence,
      JSON.stringify(input.tournamentNames),
      input.approvedVolunteer,
    ));
    await db.batch(statements);
  }
}
