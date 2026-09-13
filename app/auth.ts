import { cookies } from 'next/headers';

const SESSION_COOKIE = 'mrhs-debate-session';
const SESSION_LENGTH_SECONDS = 60 * 60 * 12;

function configuredPassword() {
  return process.env.MRHS_DASHBOARD_PASSWORD ?? '';
}

function sessionSecret() {
  return process.env.MRHS_SESSION_SECRET ?? '';
}

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function signature(expiry: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(sessionSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(expiry));
  return toBase64Url(new Uint8Array(digest));
}

async function secureEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  let difference = left.length ^ right.length;
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
  return difference === 0;
}

export async function credentialsAreValid(username: string, password: string) {
  const configured = configuredPassword();
  if (!configured) return false;
  const [usernameMatches, passwordMatches] = await Promise.all([
    secureEqual(username.trim().toLowerCase(), 'mrhs speech and debate'),
    secureEqual(password, configured),
  ]);
  return usernameMatches && passwordMatches;
}

export async function loginFingerprint(ipAddress: string, userAgent: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(sessionSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(`${ipAddress}|${userAgent.slice(0, 240)}`));
  return toBase64Url(new Uint8Array(digest));
}

export async function createSession() {
  if (!sessionSecret()) throw new Error('MRHS_SESSION_SECRET is not configured.');
  const expiry = String(Math.floor(Date.now() / 1000) + SESSION_LENGTH_SECONDS);
  const token = `${expiry}.${await signature(expiry)}`;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_LENGTH_SECONDS,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function isAuthenticated() {
  if (!sessionSecret()) return false;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const [expiry, suppliedSignature] = token.split('.');
  if (!expiry || !suppliedSignature || Number(expiry) < Date.now() / 1000) return false;
  return secureEqual(suppliedSignature, await signature(expiry));
}
