import { env } from 'cloudflare:workers';
import { createIntentMemberIndex, createIntentSubmissionsTable, createIntentTournamentIndex } from './schema';

export type EventCategory = 'ld' | 'pf' | 'speech' | 'congress' | 'other';
export type IntentSubmission = {
  id: string; sourceRow: number | null; formTimestamp: string; studentNameRaw: string;
  memberId: string | null; matchedStudentName: string | null; studentMatchStatus: 'matched' | 'review' | 'unmatched'; studentMatchConfidence: number | null;
  tournamentNameRaw: string; tournamentId: string | null; matchedTournamentName: string | null; tournamentMatchStatus: 'matched' | 'review' | 'unmatched'; tournamentMatchConfidence: number | null;
  eventRaw: string; eventCategory: EventCategory; eventDetails: string | null; tabroomEmail: string | null; studentPhone: string | null;
  parent1Name: string | null; parent1Email: string | null; parent1Phone: string | null; parent1Judging: boolean;
  parent2Name: string | null; parent2Email: string | null; parent2Phone: string | null; parent2Judging: boolean;
  receivedAt: string;
};

type IntentRow = {
  id:string; source_row:number|null; form_timestamp:string; student_name_raw:string; member_id:string|null; matched_student_name:string|null;
  student_match_status:IntentSubmission['studentMatchStatus']; student_match_confidence:number|null; tournament_name_raw:string; tournament_id:string|null;
  matched_tournament_name:string|null; tournament_match_status:IntentSubmission['tournamentMatchStatus']; tournament_match_confidence:number|null;
  event_raw:string; event_category:EventCategory; event_details:string|null; tabroom_email:string|null; student_phone:string|null;
  parent_1_name:string|null; parent_1_email:string|null; parent_1_phone:string|null; parent_1_judging:number;
  parent_2_name:string|null; parent_2_email:string|null; parent_2_phone:string|null; parent_2_judging:number; received_at:string;
};

function database() { return (env as unknown as { DB: D1Database }).DB; }
async function ensureSchema() {
  const db = database();
  await db.batch([db.prepare(createIntentSubmissionsTable), db.prepare(createIntentTournamentIndex), db.prepare(createIntentMemberIndex)]);
  return db;
}
function toIntent(row: IntentRow): IntentSubmission {
  return {
    id:row.id, sourceRow:row.source_row, formTimestamp:row.form_timestamp, studentNameRaw:row.student_name_raw, memberId:row.member_id,
    matchedStudentName:row.matched_student_name, studentMatchStatus:row.student_match_status, studentMatchConfidence:row.student_match_confidence,
    tournamentNameRaw:row.tournament_name_raw, tournamentId:row.tournament_id, matchedTournamentName:row.matched_tournament_name,
    tournamentMatchStatus:row.tournament_match_status, tournamentMatchConfidence:row.tournament_match_confidence, eventRaw:row.event_raw,
    eventCategory:row.event_category, eventDetails:row.event_details, tabroomEmail:row.tabroom_email, studentPhone:row.student_phone,
    parent1Name:row.parent_1_name, parent1Email:row.parent_1_email, parent1Phone:row.parent_1_phone, parent1Judging:Boolean(row.parent_1_judging),
    parent2Name:row.parent_2_name, parent2Email:row.parent_2_email, parent2Phone:row.parent_2_phone, parent2Judging:Boolean(row.parent_2_judging), receivedAt:row.received_at,
  };
}
export async function listIntentSubmissions(limit = 8000) {
  const db = await ensureSchema();
  const result = await db.prepare('SELECT * FROM intent_submissions ORDER BY form_timestamp DESC, received_at DESC LIMIT ?').bind(limit).all<IntentRow>();
  return result.results.map(toIntent);
}
export type SaveIntentInput = Omit<IntentSubmission, 'receivedAt' | 'sourceRow'> & { sourceKey:string; sourceRow:number|null };
export async function saveIntentSubmissions(inputs: SaveIntentInput[]) {
  const db = await ensureSchema();
  for (let offset=0; offset<inputs.length; offset+=50) {
    const statements = inputs.slice(offset, offset+50).map((input) => db.prepare(`
      INSERT INTO intent_submissions (id,source_key,source_row,form_timestamp,student_name_raw,member_id,matched_student_name,student_match_status,student_match_confidence,tournament_name_raw,tournament_id,matched_tournament_name,tournament_match_status,tournament_match_confidence,event_raw,event_category,event_details,tabroom_email,student_phone,parent_1_name,parent_1_email,parent_1_phone,parent_1_judging,parent_2_name,parent_2_email,parent_2_phone,parent_2_judging)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(source_key) DO UPDATE SET source_row=excluded.source_row,form_timestamp=excluded.form_timestamp,student_name_raw=excluded.student_name_raw,member_id=excluded.member_id,matched_student_name=excluded.matched_student_name,student_match_status=excluded.student_match_status,student_match_confidence=excluded.student_match_confidence,tournament_name_raw=excluded.tournament_name_raw,tournament_id=excluded.tournament_id,matched_tournament_name=excluded.matched_tournament_name,tournament_match_status=excluded.tournament_match_status,tournament_match_confidence=excluded.tournament_match_confidence,event_raw=excluded.event_raw,event_category=excluded.event_category,event_details=excluded.event_details,tabroom_email=excluded.tabroom_email,student_phone=excluded.student_phone,parent_1_name=excluded.parent_1_name,parent_1_email=excluded.parent_1_email,parent_1_phone=excluded.parent_1_phone,parent_1_judging=excluded.parent_1_judging,parent_2_name=excluded.parent_2_name,parent_2_email=excluded.parent_2_email,parent_2_phone=excluded.parent_2_phone,parent_2_judging=excluded.parent_2_judging,updated_at=CURRENT_TIMESTAMP
    `).bind(input.id,input.sourceKey,input.sourceRow,input.formTimestamp,input.studentNameRaw,input.memberId,input.matchedStudentName,input.studentMatchStatus,input.studentMatchConfidence,input.tournamentNameRaw,input.tournamentId,input.matchedTournamentName,input.tournamentMatchStatus,input.tournamentMatchConfidence,input.eventRaw,input.eventCategory,input.eventDetails,input.tabroomEmail,input.studentPhone,input.parent1Name,input.parent1Email,input.parent1Phone,input.parent1Judging?1:0,input.parent2Name,input.parent2Email,input.parent2Phone,input.parent2Judging?1:0));
    await db.batch(statements);
  }
}
