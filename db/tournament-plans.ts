import { env } from 'cloudflare:workers';
import { createTournamentPlansTable } from './schema';

export type JudgePool = 'available' | 'debate' | 'speech' | 'congress';
export type StudentStatus = 'going' | 'waitlist';
export type TournamentPlan = { tournamentId:string; judgeAssignments:Record<string,JudgePool>; studentStatuses:Record<string,StudentStatus>; confirmed:boolean; updatedAt:string };
type PlanRow = { tournament_id:string; judge_assignments:string; student_statuses:string; confirmed:number; updated_at:string };
function database() { return (env as unknown as { DB:D1Database }).DB; }
async function ensureSchema() { const db=database(); await db.prepare(createTournamentPlansTable).run(); return db; }
function parseRecord<T extends string>(value:string) { try { const parsed=JSON.parse(value); return parsed && typeof parsed==='object' && !Array.isArray(parsed) ? parsed as Record<string,T> : {}; } catch { return {}; } }
function toPlan(row:PlanRow):TournamentPlan { return { tournamentId:row.tournament_id, judgeAssignments:parseRecord<JudgePool>(row.judge_assignments), studentStatuses:parseRecord<StudentStatus>(row.student_statuses), confirmed:Boolean(row.confirmed), updatedAt:row.updated_at }; }
export async function listTournamentPlans() { const db=await ensureSchema(); const result=await db.prepare('SELECT * FROM tournament_plans').all<PlanRow>(); return result.results.map(toPlan); }
export async function saveTournamentPlan(input:Omit<TournamentPlan,'updatedAt'>) {
  const db=await ensureSchema();
  await db.prepare(`INSERT INTO tournament_plans (tournament_id,judge_assignments,student_statuses,confirmed) VALUES (?,?,?,?) ON CONFLICT(tournament_id) DO UPDATE SET judge_assignments=excluded.judge_assignments,student_statuses=excluded.student_statuses,confirmed=excluded.confirmed,updated_at=CURRENT_TIMESTAMP`).bind(input.tournamentId,JSON.stringify(input.judgeAssignments),JSON.stringify(input.studentStatuses),input.confirmed?1:0).run();
  const row=await db.prepare('SELECT * FROM tournament_plans WHERE tournament_id=?').bind(input.tournamentId).first<PlanRow>();
  if (!row) throw new Error('Tournament plan could not be saved.');
  return toPlan(row);
}
