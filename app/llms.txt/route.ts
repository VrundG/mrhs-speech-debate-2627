export function GET() {
  return new Response(
    'MRHS Speech & Debate Command Center\n\nPrivate administrative workspace. Student and payment records are not available for indexing or automated access.\n',
    { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' } },
  );
}
