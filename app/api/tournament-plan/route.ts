import { isAuthenticated } from '../../auth';
import { tournaments } from '../../data/tournaments';
import { saveTournamentPlan, type JudgePool, type StudentStatus } from '../../../db/tournament-plans';

export const dynamic='force-dynamic';
const pools=new Set<JudgePool>(['available','debate','speech','congress']);
const statuses=new Set<StudentStatus>(['going','waitlist']);
function validRecord<T extends string>(value:unknown,allowed:Set<T>,max:number){if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid plan data.');const entries=Object.entries(value as Record<string,unknown>);if(entries.length>max)throw new Error('Plan is too large.');const result:Record<string,T>={};for(const [key,item] of entries){if(!key||key.length>240||typeof item!=='string'||!allowed.has(item as T))throw new Error('Invalid plan entry.');result[key]=item as T;}return result;}
export async function POST(request:Request){if(!(await isAuthenticated()))return Response.json({ok:false,error:'Unauthorized'},{status:401});try{const body=await request.json() as Record<string,unknown>;const tournamentId=typeof body.tournamentId==='string'?body.tournamentId:'';if(!tournaments.some(item=>item.id===tournamentId))throw new Error('Unknown tournament.');const plan=await saveTournamentPlan({tournamentId,judgeAssignments:validRecord(body.judgeAssignments,pools,500),studentStatuses:validRecord(body.studentStatuses,statuses,1000),confirmed:body.confirmed===true});return Response.json({ok:true,plan});}catch(error){return Response.json({ok:false,error:error instanceof Error?error.message:'Invalid plan.'},{status:400});}}
