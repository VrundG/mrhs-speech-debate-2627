import { isAuthenticated } from '../../auth';
import { buildRosterPdf, type RosterPdfRow } from '../../lib/roster-pdf';

export const dynamic = 'force-dynamic';

function text(value: unknown, max: number, required = false) {
  const result = typeof value === 'string' ? value.trim().slice(0, max) : '';
  if (required && !result) throw new Error('A required PDF field is missing.');
  return result;
}

function filename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'tournament';
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const tournamentName = text(body.tournamentName, 180, true);
    const dateLabel = text(body.dateLabel, 100, true);
    const location = text(body.location, 180, true);
    if (!Array.isArray(body.rows) || body.rows.length > 500) throw new Error('Invalid roster rows.');
    const rows: RosterPdfRow[] = body.rows.map(item => {
      if (!item || typeof item !== 'object') throw new Error('Invalid roster row.');
      const row = item as Record<string, unknown>;
      return {
        name: text(row.name, 160, true),
        event: text(row.event, 240, true),
        partner: text(row.partner, 160),
        coverage: text(row.coverage, 160, true),
      };
    });
    const pdf = buildRosterPdf({ tournamentName, dateLabel, location, generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' UTC '), rows });
    return new Response(pdf, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${filename(tournamentName)}-finalized-roster.pdf"`,
        'cache-control': 'private, no-store',
      },
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Could not create PDF.' }, { status: 400 });
  }
}
