import { resolveRosterName } from '../../lib/name-matcher';
import { listMembers, markActiveMemberReturning, saveAccountSetup, type AccountState } from '../../../db/members';

export const dynamic = 'force-dynamic';

type SubmissionBody = {
  sourceKey?: unknown;
  timestamp?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  tabroomAccountCreated?: unknown;
  tabroomEmail?: unknown;
  nsdaAccountCreated?: unknown;
  nsdaEmail?: unknown;
  jbJwLinked?: unknown;
  priorDues2025?: unknown;
};

function cleanText(value: unknown, maximum: number, required = false) {
  const text = typeof value === 'string' ? value.trim().slice(0, maximum) : '';
  if (required && !text) throw new Error('A required field is missing.');
  return text || null;
}

function cleanEmail(value: unknown) {
  const email = cleanText(value, 254);
  return email?.toLowerCase() ?? null;
}

function accountState(value: unknown): AccountState {
  const text = cleanText(value, 30)?.toLowerCase();
  if (text === 'yes') return 'yes';
  if (text === 'no') return 'no';
  return 'unknown';
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
    cleanText(body.sourceKey, 300, true);
    const firstName = cleanText(body.firstName, 80);
    const lastName = cleanText(body.lastName, 80);
    const name = `${firstName ?? ''} ${lastName ?? ''}`.replace(/\s+/g, ' ').trim();
    const timestampInput = cleanText(body.timestamp, 100, true)!;
    const parsedTimestamp = new Date(timestampInput);
    if (Number.isNaN(parsedTimestamp.getTime())) throw new Error('The response timestamp is invalid.');

    const roster = await listMembers();
    const tabroomEmail = cleanEmail(body.tabroomEmail);
    const nsdaEmail = cleanEmail(body.nsdaEmail);
    const submittedEmails = new Set([tabroomEmail, nsdaEmail].filter((email): email is string => Boolean(email)));
    const emailMatches = roster.filter((member) => (
      [member.schoolEmail, member.personalEmail, member.tabroomEmail, member.nsdaEmail]
        .filter((email): email is string => Boolean(email))
        .some((email) => submittedEmails.has(email.toLowerCase()))
    ));
    const rosterMatch = name ? resolveRosterName(name, roster) : { status: 'empty' as const, suggestions: [] };
    const matchedMember = emailMatches.length === 1
      ? emailMatches[0]
      : rosterMatch.status === 'matched' ? rosterMatch.member : null;
    if (!matchedMember) {
      return Response.json({
        ok: false,
        error: 'Student needs manual review before account details can be attached.',
        student: { status: emailMatches.length > 1 ? 'review' : rosterMatch.status },
      }, { status: 409 });
    }

    await saveAccountSetup(matchedMember.id, {
      tabroomAccountCreated: accountState(body.tabroomAccountCreated),
      tabroomEmail,
      nsdaAccountCreated: accountState(body.nsdaAccountCreated),
      nsdaEmail,
      jbJwLinked: cleanText(body.jbJwLinked, 100),
      accountSetupTimestamp: parsedTimestamp.toISOString(),
    });

    const priorDues2025 = cleanText(body.priorDues2025, 160);
    if (priorDues2025 && priorDues2025 !== '?') {
      await markActiveMemberReturning(matchedMember.id);
    }

    return Response.json({ ok: true, memberId: matchedMember.id, name: matchedMember.name });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Invalid account setup submission.' },
      { status: 400 },
    );
  }
}
