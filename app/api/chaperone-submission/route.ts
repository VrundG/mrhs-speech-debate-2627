import { resolveRosterName } from '../../lib/name-matcher';
import { saveChaperoneSubmissions, type SaveChaperoneInput } from '../../../db/chaperones';
import { listMembers } from '../../../db/members';

export const dynamic = 'force-dynamic';

type SubmissionBody = {
  sourceKey?: unknown;
  sourceRow?: unknown;
  timestamp?: unknown;
  parentName?: unknown;
  parentEmail?: unknown;
  parentPhone?: unknown;
  desiredEvent?: unknown;
  transport?: unknown;
  studentName?: unknown;
  tournamentNames?: unknown;
  confirmedTournamentNames?: unknown;
  approvedVolunteer?: unknown;
};

function cleanText(value: unknown, maximum: number, required = false) {
  const text = typeof value === 'string' ? value.trim().slice(0, maximum) : '';
  if (required && !text) throw new Error('A required field is missing.');
  return text || null;
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function authorized(request: Request) {
  const configured = process.env.MRHS_FORM_WEBHOOK_SECRET ?? '';
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!configured || !supplied) return false;
  return (await digest(configured)) === (await digest(supplied));
}

function approvedStatus(value: unknown): 'yes' | 'no' | 'unknown' {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'yes') return 'yes';
  if (normalized === 'no') return 'no';
  return 'unknown';
}

async function prepareSubmission(body: SubmissionBody): Promise<SaveChaperoneInput> {
  const sourceKey = cleanText(body.sourceKey, 300, true)!;
  const studentName = cleanText(body.studentName, 160, true)!;
  const parentName = cleanText(body.parentName, 160, true)!;
  const timestampInput = cleanText(body.timestamp, 100, true)!;
  const parsedTimestamp = new Date(timestampInput);
  if (Number.isNaN(parsedTimestamp.getTime())) throw new Error('The response timestamp is invalid.');

  const rosterMatch = resolveRosterName(studentName, await listMembers());
  const tournamentNames = Array.isArray(body.tournamentNames)
    ? body.tournamentNames.map((value) => cleanText(value, 240)).filter((value): value is string => Boolean(value)).slice(0, 40)
    : [];
  const confirmedTournamentNames = Array.isArray(body.confirmedTournamentNames)
    ? body.confirmedTournamentNames.map((value) => cleanText(value, 240)).filter((value): value is string => Boolean(value)).slice(0, 40)
    : [];

  return {
    id: (await digest(sourceKey)).slice(0, 24),
    sourceKey,
    sourceRow: typeof body.sourceRow === 'number' && Number.isInteger(body.sourceRow) ? body.sourceRow : null,
    formTimestamp: parsedTimestamp.toISOString(),
    parentName,
    parentEmail: cleanText(body.parentEmail, 240),
    parentPhone: cleanText(body.parentPhone, 80),
    desiredEvent: cleanText(body.desiredEvent, 240),
    transport: cleanText(body.transport, 160),
    studentNameRaw: studentName,
    memberId: rosterMatch.status === 'matched' ? rosterMatch.member.id : null,
    matchedStudentName: rosterMatch.status === 'matched' ? rosterMatch.member.name : null,
    studentMatchStatus: rosterMatch.status === 'empty' ? 'unmatched' : rosterMatch.status,
    studentMatchConfidence: 'confidence' in rosterMatch ? rosterMatch.confidence : null,
    tournamentNames,
    confirmedTournamentNames,
    approvedVolunteer: approvedStatus(body.approvedVolunteer),
  };
}

export async function POST(request: Request) {
  if (!(await authorized(request))) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json() as SubmissionBody | { submissions?: unknown };
    const bodies = 'submissions' in payload && Array.isArray(payload.submissions)
      ? payload.submissions.slice(0, 500) as SubmissionBody[]
      : [payload as SubmissionBody];
    if (!bodies.length) throw new Error('No submissions were provided.');
    const inputs = await Promise.all(bodies.map(prepareSubmission));
    await saveChaperoneSubmissions(inputs);
    const matched = inputs.filter((input) => input.studentMatchStatus === 'matched').length;
    return Response.json({ ok: true, received: inputs.length, matched, review: inputs.length - matched });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Invalid submission.' },
      { status: 400 },
    );
  }
}
