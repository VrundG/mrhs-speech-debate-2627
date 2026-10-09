import { deleteStaleIntentSubmissions } from '../../../db/intents';

export const dynamic = 'force-dynamic';

async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function authorized(request: Request) {
  const configured = process.env.MRHS_FORM_WEBHOOK_SECRET ?? '';
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  return Boolean(configured && supplied && (await digest(configured)) === (await digest(supplied)));
}

export async function POST(request: Request) {
  if (!(await authorized(request))) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = (await request.json()) as { sourceKey?: unknown; timestamps?: unknown };
    const sourceParts = typeof body.sourceKey === 'string' ? body.sourceKey.split(':') : [];
    if (sourceParts.length < 2 || !sourceParts[0] || !sourceParts[1]) throw new Error('The sheet identity is invalid.');
    if (!Array.isArray(body.timestamps) || !body.timestamps.length || body.timestamps.length > 500) {
      throw new Error('Provide between 1 and 500 response timestamps.');
    }
    const sourceIdentity = sourceParts.slice(0, 2).join(':');
    const currentSourceKeys = Array.from(new Set(body.timestamps.map((value) => {
      const parsed = new Date(typeof value === 'string' ? value : '');
      if (Number.isNaN(parsed.getTime())) throw new Error('A response timestamp is invalid.');
      return `${sourceIdentity}:timestamp:${parsed.toISOString()}`;
    })));
    const deleted = await deleteStaleIntentSubmissions(sourceIdentity, currentSourceKeys);
    return Response.json({ ok: true, current: currentSourceKeys.length, deleted });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Invalid reconciliation request.' }, { status: 400 });
  }
}
