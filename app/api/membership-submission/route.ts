import { normalizePersonName, resolveRosterName } from '../../lib/name-matcher';
import {
  listMembers,
  saveMembershipSubmission,
  type Member,
} from '../../../db/members';

export const dynamic = 'force-dynamic';

type SubmissionBody = {
  sourceKey?: unknown;
  timestamp?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  graduationYear?: unknown;
  schoolEmail?: unknown;
  personalEmail?: unknown;
  phoneNumber?: unknown;
  parent1Name?: unknown;
  parent1Email?: unknown;
  parent1Phone?: unknown;
  parent2Name?: unknown;
  parent2Email?: unknown;
  parent2Phone?: unknown;
  priorExperience?: unknown;
  priorEvents?: unknown;
  shirtSize?: unknown;
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

function splitEvents(value: unknown) {
  const text = cleanText(value, 800);
  if (!text) return [];
  return Array.from(new Set(text.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean))).slice(0, 30);
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

function emptyMember(id: string, name: string): Member {
  return {
    id,
    name,
    role: 'Student',
    memberType: 'New member',
    membershipFee: 65,
    membershipStatus: 'Unpaid',
    eventHistory: [],
    tournamentHistory: [],
    activeSeason: null,
    graduationYear: null,
    schoolEmail: null,
    personalEmail: null,
    phoneNumber: null,
    parent1Name: null,
    parent1Email: null,
    parent1Phone: null,
    parent2Name: null,
    parent2Email: null,
    parent2Phone: null,
    priorExperience: null,
    priorEvents: [],
    shirtSize: null,
    tabroomAccountCreated: 'unknown',
    tabroomEmail: null,
    nsdaAccountCreated: 'unknown',
    nsdaEmail: null,
    jbJwLinked: null,
    membershipFormTimestamp: null,
    accountSetupTimestamp: null,
  };
}

export async function POST(request: Request) {
  if (!(await authorized(request))) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as SubmissionBody;
    const firstName = cleanText(body.firstName, 80, true)!;
    const lastName = cleanText(body.lastName, 80, true)!;
    const name = `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();
    const timestampInput = cleanText(body.timestamp, 100, true)!;
    const parsedTimestamp = new Date(timestampInput);
    if (Number.isNaN(parsedTimestamp.getTime())) throw new Error('The response timestamp is invalid.');
    cleanText(body.sourceKey, 300, true);

    const roster = await listMembers();
    const rosterMatch = resolveRosterName(name, roster);
    const existing = rosterMatch.status === 'matched' ? rosterMatch.member : null;
    const priorEvents = splitEvents(body.priorEvents);
    const id = existing?.id ?? `m-${(await digest(normalizePersonName(name))).slice(0, 16)}`;
    const memberType = existing?.activeSeason === '2026-27'
      ? existing.memberType
      : existing ? 'Returning member' : 'New member';
    const member = {
      ...(existing ?? emptyMember(id, name)),
      id,
      name,
      memberType,
      membershipFee: memberType === 'Returning member' ? 45 as const : 65 as const,
      eventHistory: Array.from(new Set([...(existing?.eventHistory ?? []), ...priorEvents])),
    } satisfies Member;

    await saveMembershipSubmission(member, {
      activeSeason: '2026-27',
      graduationYear: cleanText(body.graduationYear, 10),
      schoolEmail: cleanEmail(body.schoolEmail),
      personalEmail: cleanEmail(body.personalEmail),
      phoneNumber: cleanText(body.phoneNumber, 40),
      parent1Name: cleanText(body.parent1Name, 160),
      parent1Email: cleanEmail(body.parent1Email),
      parent1Phone: cleanText(body.parent1Phone, 40),
      parent2Name: cleanText(body.parent2Name, 160),
      parent2Email: cleanEmail(body.parent2Email),
      parent2Phone: cleanText(body.parent2Phone, 40),
      priorExperience: /^yes$/i.test(cleanText(body.priorExperience, 20) ?? '')
        ? true
        : /^no$/i.test(cleanText(body.priorExperience, 20) ?? '') ? false : null,
      priorEvents,
      shirtSize: cleanText(body.shirtSize, 30),
      membershipFormTimestamp: parsedTimestamp.toISOString(),
    });

    return Response.json({ ok: true, memberId: id, name, memberType });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Invalid membership submission.' },
      { status: 400 },
    );
  }
}
