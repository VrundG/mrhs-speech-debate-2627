import { isAuthenticated } from '../../auth';
import { tournaments } from '../../data/tournaments';
import { buildPermissionFormPdf } from '../../lib/permission-form-pdf';
import templateDataUrl from '../../assets/permission-form-template.jpg?inline';

export const dynamic = 'force-dynamic';

function filename(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70) || 'tournament'
  );
}

function templateBytes() {
  const encoded = templateDataUrl.slice(templateDataUrl.indexOf(',') + 1);
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function GET(request: Request) {
  if (!(await isAuthenticated()))
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const tournamentId =
      new URL(request.url).searchParams.get('tournamentId') ?? '';
    const tournament = tournaments.find((item) => item.id === tournamentId);
    if (!tournament) throw new Error('Unknown tournament.');
    const { bytes } = buildPermissionFormPdf(
      templateBytes(),
      tournament,
    );
    return new Response(bytes, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${filename(tournament.name)}-permission-form.pdf"`,
        'cache-control': 'private, no-store',
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Could not create permission form.',
      },
      { status: 400 },
    );
  }
}
