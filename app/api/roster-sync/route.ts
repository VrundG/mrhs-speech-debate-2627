import { upsertMembers, type Member } from '../../../db/members';

export const dynamic = 'force-dynamic';

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

function validMember(value: unknown): value is Member {
  if (!value || typeof value !== 'object') return false;
  const member = value as Partial<Member>;
  return typeof member.id === 'string' && member.id.length > 0 && member.id.length <= 80
    && typeof member.name === 'string' && member.name.trim().length > 0 && member.name.length <= 160
    && member.role === 'Student'
    && (member.memberType === 'Returning member' || member.memberType === 'New member')
    && (member.membershipFee === 45 || member.membershipFee === 65)
    && (member.membershipStatus === 'Paid' || member.membershipStatus === 'Unpaid')
    && Array.isArray(member.eventHistory) && member.eventHistory.length <= 100
    && member.eventHistory.every((item) => typeof item === 'string' && item.length <= 160)
    && Array.isArray(member.tournamentHistory) && member.tournamentHistory.length <= 200
    && member.tournamentHistory.every((item) => Boolean(item)
      && typeof item.tournament === 'string' && item.tournament.length <= 240
      && (item.date === null || typeof item.date === 'string'));
}

export async function POST(request: Request) {
  if (!(await authorized(request))) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as { members?: unknown };
    if (!Array.isArray(body.members) || body.members.length === 0 || body.members.length > 1000) {
      throw new Error('Provide between 1 and 1,000 members.');
    }
    if (!body.members.every(validMember)) throw new Error('One or more member records are invalid.');
    const uniqueIds = new Set(body.members.map((member) => member.id));
    if (uniqueIds.size !== body.members.length) throw new Error('Duplicate member IDs are not allowed.');
    await upsertMembers(body.members);
    return Response.json({ ok: true, imported: body.members.length });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Invalid roster.' },
      { status: 400 },
    );
  }
}
