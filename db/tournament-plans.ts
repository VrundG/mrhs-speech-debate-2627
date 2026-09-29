import { env } from 'cloudflare:workers';
import { createTournamentPfPartnersTable, createTournamentPlansTable } from './schema';

export type JudgePool = 'available' | 'debate' | 'speech' | 'congress';
export type StudentStatus = 'going' | 'waitlist';
export type TournamentPlan = { tournamentId:string; judgeAssignments:Record<string,JudgePool>; studentStatuses:Record<string,StudentStatus>; pfPartnerAssignments:Record<string,string>; confirmed:boolean; updatedAt:string };
type PlanRow = { tournament_id:string; judge_assignments:string; student_statuses:string; partner_assignments:string|null; confirmed:number; updated_at:string };
function database() { return (env as unknown as { DB:D1Database }).DB; }
async function ensureSchema() { const db=database(); await db.batch([db.prepare(createTournamentPlansTable),db.prepare(createTournamentPfPartnersTable)]); return db; }
function parseRecord<T extends string>(value:string) { try { const parsed=JSON.parse(value); return parsed && typeof parsed==='object' && !Array.isArray(parsed) ? parsed as Record<string,T> : {}; } catch { return {}; } }
function toPlan(row:PlanRow):TournamentPlan { return { tournamentId:row.tournament_id, judgeAssignments:parseRecord<JudgePool>(row.judge_assignments), studentStatuses:parseRecord<StudentStatus>(row.student_statuses), pfPartnerAssignments:parseRecord<string>(row.partner_assignments??'{}'), confirmed:Boolean(row.confirmed), updatedAt:row.updated_at }; }
const selectPlans='SELECT p.*, f.partner_assignments FROM tournament_plans p LEFT JOIN tournament_pf_partners f ON f.tournament_id=p.tournament_id';
export async function listTournamentPlans() { const db=await ensureSchema(); const result=await db.prepare(selectPlans).all<PlanRow>(); return result.results.map(toPlan); }
export async function saveTournamentPlan(input:Omit<TournamentPlan,'updatedAt'>) {
  const db=await ensureSchema();
  await db.batch([db.prepare(`INSERT INTO tournament_plans (tournament_id,judge_assignments,student_statuses,confirmed) VALUES (?,?,?,?) ON CONFLICT(tournament_id) DO UPDATE SET judge_assignments=excluded.judge_assignments,student_statuses=excluded.student_statuses,confirmed=excluded.confirmed,updated_at=CURRENT_TIMESTAMP`).bind(input.tournamentId,JSON.stringify(input.judgeAssignments),JSON.stringify(input.studentStatuses),input.confirmed?1:0),db.prepare(`INSERT INTO tournament_pf_partners (tournament_id,partner_assignments) VALUES (?,?) ON CONFLICT(tournament_id) DO UPDATE SET partner_assignments=excluded.partner_assignments,updated_at=CURRENT_TIMESTAMP`).bind(input.tournamentId,JSON.stringify(input.pfPartnerAssignments))]);
  const row=await db.prepare(`${selectPlans} WHERE p.tournament_id=?`).bind(input.tournamentId).first<PlanRow>();
  if (!row) throw new Error('Tournament plan could not be saved.');
  return toPlan(row);
}
