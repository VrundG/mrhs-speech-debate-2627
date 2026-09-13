import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow orange">404 · Page not found</p>
      <h1>That page missed the docket.</h1>
      <p>The address may be outdated, or the page may only exist inside the private dashboard.</p>
      <Link href="/">Return to command center <span aria-hidden="true">↗</span></Link>
    </main>
  );
}
