import { tournaments } from '../../data/tournaments';
import { resolveRosterName } from '../../lib/name-matcher';
import { resolveTournamentName } from '../../lib/tournament-matcher';
import { savePaymentSubmission } from '../../../db/payments';
import { listMembers } from '../../../db/members';

export const dynamic = 'force-dynamic';

type SubmissionBody = {
  sourceKey?: unknown;
  sourceRow?: unknown;
  timestamp?: unknown;
  studentName?: unknown;
  paymentFor?: unknown;
  paymentType?: unknown;
  receiptUrl?: unknown;
  lateReason?: unknown;
  tournamentName?: unknown;
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

export async function POST(request: Request) {
  if (!(await authorized(request))) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as SubmissionBody;
    const sourceKey = cleanText(body.sourceKey, 300, true)!;
    const studentName = cleanText(body.studentName, 160, true)!;
    const paymentFor = cleanText(body.paymentFor, 100, true)!;
    const paymentType = cleanText(body.paymentType, 100, true)!;
    const timestampInput = cleanText(body.timestamp, 100, true)!;
    const parsedTimestamp = new Date(timestampInput);
    if (Number.isNaN(parsedTimestamp.getTime())) throw new Error('The response timestamp is invalid.');

    const receiptUrl = cleanText(body.receiptUrl, 2048);
    if (receiptUrl && !/^https:\/\//i.test(receiptUrl)) {
      throw new Error('The receipt must be an HTTPS link.');
    }
    const tournamentName = cleanText(body.tournamentName, 240);
    const rosterMatch = resolveRosterName(studentName, await listMembers());
    const tournamentMatch = resolveTournamentName(tournamentName ?? '', tournaments);
    const id = (await digest(sourceKey)).slice(0, 24);

    await savePaymentSubmission({
      id,
      sourceKey,
      sourceRow: typeof body.sourceRow === 'number' && Number.isInteger(body.sourceRow) ? body.sourceRow : null,
      formTimestamp: parsedTimestamp.toISOString(),
      studentNameRaw: studentName,
      memberId: rosterMatch.status === 'matched' ? rosterMatch.member.id : null,
      matchedStudentName: rosterMatch.status === 'matched' ? rosterMatch.member.name : null,
      studentMatchStatus: rosterMatch.status === 'empty' ? 'unmatched' : rosterMatch.status,
      studentMatchConfidence: 'confidence' in rosterMatch ? rosterMatch.confidence : null,
      paymentFor,
      paymentType,
      receiptUrl,
      lateReason: cleanText(body.lateReason, 1000),
      tournamentNameRaw: tournamentName,
      tournamentId: tournamentMatch.status === 'matched' ? tournamentMatch.tournament.id : null,
      matchedTournamentName: tournamentMatch.status === 'matched' ? tournamentMatch.tournament.name : null,
      tournamentMatchStatus: tournamentMatch.status,
      tournamentMatchConfidence: tournamentMatch.confidence,
    });

    return Response.json({
      ok: true,
      paymentId: id,
      student: rosterMatch.status === 'matched'
        ? { status: 'matched', name: rosterMatch.member.name }
        : { status: rosterMatch.status },
      tournament: tournamentMatch.status === 'matched'
        ? { status: 'matched', name: tournamentMatch.tournament.name }
        : { status: tournamentMatch.status },
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Invalid submission.' },
      { status: 400 },
    );
  }
}
