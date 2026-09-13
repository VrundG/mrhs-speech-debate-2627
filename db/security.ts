import { env } from 'cloudflare:workers';
import { createLoginAttemptsTable } from './schema';

const ATTEMPT_WINDOW_SECONDS = 15 * 60;
const MAXIMUM_FAILED_ATTEMPTS = 8;

type LoginAttemptRow = {
  failed_count: number;
  window_started_at: number;
  blocked_until: number | null;
};

function database() {
  return (env as unknown as { DB: D1Database }).DB;
}

async function ensureSecuritySchema() {
  const db = database();
  await db.prepare(createLoginAttemptsTable).run();
  return db;
}

export async function isLoginBlocked(fingerprint: string) {
  const db = await ensureSecuritySchema();
  const now = Math.floor(Date.now() / 1000);
  const attempt = await db.prepare(
    'SELECT failed_count, window_started_at, blocked_until FROM login_attempts WHERE fingerprint = ?',
  ).bind(fingerprint).first<LoginAttemptRow>();
  if (!attempt) return false;
  if (attempt.blocked_until && attempt.blocked_until > now) return true;
  if (now - attempt.window_started_at >= ATTEMPT_WINDOW_SECONDS) {
    await db.prepare('DELETE FROM login_attempts WHERE fingerprint = ?').bind(fingerprint).run();
  }
  return false;
}

export async function recordFailedLogin(fingerprint: string) {
  const db = await ensureSecuritySchema();
  const now = Math.floor(Date.now() / 1000);
  const existing = await db.prepare(
    'SELECT failed_count, window_started_at, blocked_until FROM login_attempts WHERE fingerprint = ?',
  ).bind(fingerprint).first<LoginAttemptRow>();
  const inCurrentWindow = Boolean(existing && now - existing.window_started_at < ATTEMPT_WINDOW_SECONDS);
  const failedCount = inCurrentWindow ? existing!.failed_count + 1 : 1;
  const windowStartedAt = inCurrentWindow ? existing!.window_started_at : now;
  const blockedUntil = failedCount >= MAXIMUM_FAILED_ATTEMPTS ? now + ATTEMPT_WINDOW_SECONDS : null;
  await db.prepare(`
    INSERT INTO login_attempts (fingerprint, failed_count, window_started_at, blocked_until)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(fingerprint) DO UPDATE SET
      failed_count = excluded.failed_count,
      window_started_at = excluded.window_started_at,
      blocked_until = excluded.blocked_until,
      updated_at = CURRENT_TIMESTAMP
  `).bind(fingerprint, failedCount, windowStartedAt, blockedUntil).run();
}

export async function clearLoginAttempts(fingerprint: string) {
  const db = await ensureSecuritySchema();
  await db.prepare('DELETE FROM login_attempts WHERE fingerprint = ?').bind(fingerprint).run();
}
