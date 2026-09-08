import { env } from 'cloudflare:workers';
import {
  createPaymentMemberIndex,
  createPaymentSubmissionsTable,
  createPaymentTimestampIndex,
  createPaymentTournamentIndex,
} from './schema';

export type PaymentSubmission = {
  id: string;
  sourceRow: number | null;
  formTimestamp: string;
  studentNameRaw: string;
  memberId: string | null;
  matchedStudentName: string | null;
  studentMatchStatus: 'matched' | 'review' | 'unmatched';
  studentMatchConfidence: number | null;
  paymentFor: string;
  paymentType: string;
  receiptUrl: string | null;
  lateReason: string | null;
  tournamentNameRaw: string | null;
  tournamentId: string | null;
  matchedTournamentName: string | null;
  tournamentMatchStatus: 'matched' | 'review' | 'not_applicable' | 'unmatched';
  tournamentMatchConfidence: number | null;
  receivedAt: string;
};

type PaymentRow = {
  id: string;
  source_row: number | null;
  form_timestamp: string;
  student_name_raw: string;
  member_id: string | null;
  matched_student_name: string | null;
  student_match_status: PaymentSubmission['studentMatchStatus'];
  student_match_confidence: number | null;
  payment_for: string;
  payment_type: string;
  receipt_url: string | null;
  late_reason: string | null;
  tournament_name_raw: string | null;
  tournament_id: string | null;
  matched_tournament_name: string | null;
  tournament_match_status: PaymentSubmission['tournamentMatchStatus'];
  tournament_match_confidence: number | null;
  received_at: string;
};

function database() {
  return (env as unknown as { DB: D1Database }).DB;
}

export async function ensurePaymentSchema() {
  const db = database();
  await db.batch([
    db.prepare(createPaymentSubmissionsTable),
    db.prepare(createPaymentMemberIndex),
    db.prepare(createPaymentTournamentIndex),
    db.prepare(createPaymentTimestampIndex),
  ]);
  return db;
}

function toPayment(row: PaymentRow): PaymentSubmission {
  return {
    id: row.id,
    sourceRow: row.source_row,
    formTimestamp: row.form_timestamp,
    studentNameRaw: row.student_name_raw,
    memberId: row.member_id,
    matchedStudentName: row.matched_student_name,
    studentMatchStatus: row.student_match_status,
    studentMatchConfidence: row.student_match_confidence,
    paymentFor: row.payment_for,
    paymentType: row.payment_type,
    receiptUrl: row.receipt_url,
    lateReason: row.late_reason,
    tournamentNameRaw: row.tournament_name_raw,
    tournamentId: row.tournament_id,
    matchedTournamentName: row.matched_tournament_name,
    tournamentMatchStatus: row.tournament_match_status,
    tournamentMatchConfidence: row.tournament_match_confidence,
    receivedAt: row.received_at,
  };
}

export async function listPaymentSubmissions(limit = 250) {
  const db = await ensurePaymentSchema();
  const result = await db.prepare(`
    SELECT id, source_row, form_timestamp, student_name_raw, member_id, matched_student_name,
      student_match_status, student_match_confidence, payment_for, payment_type, receipt_url,
      late_reason, tournament_name_raw, tournament_id, matched_tournament_name,
      tournament_match_status, tournament_match_confidence, received_at
    FROM payment_submissions
    ORDER BY form_timestamp DESC, received_at DESC
    LIMIT ?
  `).bind(limit).all<PaymentRow>();
  return result.results.map(toPayment);
}

export type SavePaymentInput = Omit<PaymentSubmission, 'receivedAt' | 'sourceRow'> & {
  sourceKey: string;
  sourceRow: number | null;
};

export async function savePaymentSubmission(input: SavePaymentInput) {
  const db = await ensurePaymentSchema();
  const statement = db.prepare(
    'INSERT INTO payment_submissions ' +
    '(id, source_key, source_row, form_timestamp, student_name_raw, member_id, matched_student_name, student_match_status, student_match_confidence, payment_for, payment_type, receipt_url, late_reason, tournament_name_raw, tournament_id, matched_tournament_name, tournament_match_status, tournament_match_confidence) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ' +
    'ON CONFLICT(source_key) DO UPDATE SET ' +
    'source_row = excluded.source_row, form_timestamp = excluded.form_timestamp, student_name_raw = excluded.student_name_raw, ' +
    'member_id = excluded.member_id, matched_student_name = excluded.matched_student_name, student_match_status = excluded.student_match_status, ' +
    'student_match_confidence = excluded.student_match_confidence, payment_for = excluded.payment_for, payment_type = excluded.payment_type, ' +
    'receipt_url = excluded.receipt_url, late_reason = excluded.late_reason, tournament_name_raw = excluded.tournament_name_raw, ' +
    'tournament_id = excluded.tournament_id, matched_tournament_name = excluded.matched_tournament_name, ' +
    'tournament_match_status = excluded.tournament_match_status, tournament_match_confidence = excluded.tournament_match_confidence, updated_at = CURRENT_TIMESTAMP',
  );
  await statement.bind(
    input.id,
    input.sourceKey,
    input.sourceRow,
    input.formTimestamp,
    input.studentNameRaw,
    input.memberId,
    input.matchedStudentName,
    input.studentMatchStatus,
    input.studentMatchConfidence,
    input.paymentFor,
    input.paymentType,
    input.receiptUrl,
    input.lateReason,
    input.tournamentNameRaw,
    input.tournamentId,
    input.matchedTournamentName,
    input.tournamentMatchStatus,
    input.tournamentMatchConfidence,
  ).run();
}
