import { redirect } from 'next/navigation';
import { login } from '../actions';
import { isAuthenticated } from '../auth';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAuthenticated()) redirect('/');
  const { error } = await searchParams;

  return (
    <main className="login-shell">
      <section className="login-brand" aria-label="Marvin Ridge Speech and Debate">
        <div className="brand-lockup">
          <img className="brand-mark" src="/marvin-logo.jpeg" alt="Marvin Ridge Mavericks" width={158} height={158} />
          <span>Speech &amp; Debate</span>
        </div>
        <div className="login-statement">
          <p className="eyebrow">Chapter operations · 2026–27</p>
          <h1>One place for every entry, fee, and deadline.</h1>
          <p>A private command center for the Marvin Ridge Speech &amp; Debate team.</p>
        </div>
        <p className="login-footnote">Marvin Ridge High School · Waxhaw, North Carolina</p>
      </section>

      <section className="login-panel">
        <form action={login} className="login-form">
          <div>
            <p className="eyebrow orange">Admin access</p>
            <h2>Welcome back.</h2>
            <p className="form-intro">Sign in to view the private student ledger.</p>
          </div>
          <label><span>Username</span><input name="username" autoComplete="username" placeholder="MRHS speech and debate" required /></label>
          <label><span>Password</span><input name="password" type="password" autoComplete="current-password" placeholder="Enter password" required /></label>
          {error === 'rate' ? <p className="form-error" role="alert">Too many attempts. Try again in 15 minutes.</p> : null}
          {error && error !== 'rate' ? <p className="form-error" role="alert">That username or password is incorrect.</p> : null}
          <button type="submit">Enter command center <span aria-hidden="true">↗</span></button>
          <p className="privacy-note">Private student and payment information. Authorized team use only.</p>
        </form>
      </section>
    </main>
  );
}
