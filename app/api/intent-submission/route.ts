import { listMembers } from '../../../db/members';
import { saveIntentSubmissions, type EventCategory, type SaveIntentInput } from '../../../db/intents';
import { tournaments } from '../../data/tournaments';
import { resolveRosterName } from '../../lib/name-matcher';
import { resolveTournamentName } from '../../lib/tournament-matcher';

export const dynamic = 'force-dynamic';
type Body = Record<string, unknown>;
function clean(value:unknown,max:number,required=false){const text=typeof value==='string'?value.trim().slice(0,max):'';if(required&&!text)throw new Error('A required field is missing.');return text||null;}
async function digest(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');}
async function authorized(request:Request){const configured=process.env.MRHS_FORM_WEBHOOK_SECRET??'';const supplied=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')??'';return Boolean(configured&&supplied&&(await digest(configured))===(await digest(supplied)));}
function yes(value:unknown){return typeof value==='string'&&/^(yes|y|true|1)/i.test(value.trim());}
function category(value:string):EventCategory { const text=value.toLowerCase(); if(/congress|congressional/.test(text))return'congress'; if(/(^|\W)ld(\W|$)|lincoln/.test(text))return'ld'; if(/(^|\W)pf(\W|$)|public forum/.test(text))return'pf'; if(/speech/.test(text))return'speech'; return'other'; }
async function prepare(body:Body):Promise<SaveIntentInput>{
  const sourceKey=clean(body.sourceKey,300,true)!;const studentName=clean(body.studentName,160,true)!;const tournamentName=clean(body.tournamentName,240,true)!;const eventRaw=clean(body.event,200,true)!;
  const parsed=new Date(clean(body.timestamp,100,true)!);if(Number.isNaN(parsed.getTime()))throw new Error('The response timestamp is invalid.');
  const [roster,tournament]=[resolveRosterName(studentName,await listMembers()),resolveTournamentName(tournamentName,tournaments)];
  return {id:(await digest(sourceKey)).slice(0,24),sourceKey,sourceRow:typeof body.sourceRow==='number'&&Number.isInteger(body.sourceRow)?body.sourceRow:null,formTimestamp:parsed.toISOString(),studentNameRaw:studentName,
    memberId:roster.status==='matched'?roster.member.id:null,matchedStudentName:roster.status==='matched'?roster.member.name:null,studentMatchStatus:roster.status==='empty'?'unmatched':roster.status,studentMatchConfidence:'confidence'in roster?roster.confidence:null,
    tournamentNameRaw:tournamentName,tournamentId:tournament.status==='matched'?tournament.tournament.id:null,matchedTournamentName:tournament.status==='matched'?tournament.tournament.name:null,tournamentMatchStatus:tournament.status==='not_applicable'?'unmatched':tournament.status,tournamentMatchConfidence:'confidence'in tournament?tournament.confidence:null,
    eventRaw,eventCategory:category(eventRaw),eventDetails:clean(body.eventDetails,1000),tabroomEmail:clean(body.tabroomEmail,240),studentPhone:clean(body.studentPhone,80),
    parent1Name:clean(body.parent1Name,160),parent1Email:clean(body.parent1Email,240),parent1Phone:clean(body.parent1Phone,80),parent1Judging:yes(body.parent1Judging),
    parent2Name:clean(body.parent2Name,160),parent2Email:clean(body.parent2Email,240),parent2Phone:clean(body.parent2Phone,80),parent2Judging:yes(body.parent2Judging)};
}
export async function POST(request:Request){if(!(await authorized(request)))return Response.json({ok:false,error:'Unauthorized'},{status:401});try{const payload=await request.json() as Body|{submissions?:unknown};const bodies='submissions'in payload&&Array.isArray(payload.submissions)?payload.submissions.slice(0,500) as Body[]:[payload as Body];const inputs=await Promise.all(bodies.map(prepare));await saveIntentSubmissions(inputs);return Response.json({ok:true,received:inputs.length,matched:inputs.filter(item=>item.studentMatchStatus==='matched'&&item.tournamentMatchStatus==='matched').length,review:inputs.filter(item=>item.studentMatchStatus!=='matched'||item.tournamentMatchStatus!=='matched').length});}catch(error){return Response.json({ok:false,error:error instanceof Error?error.message:'Invalid submission.'},{status:400});}}
