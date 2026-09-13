'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { clearSession, createSession, credentialsAreValid, loginFingerprint } from './auth';
import { clearLoginAttempts, isLoginBlocked, recordFailedLogin } from '../db/security';

export async function login(formData: FormData) {
  const usernameValue = formData.get('username');
  const passwordValue = formData.get('password');
  const username = typeof usernameValue === 'string' ? usernameValue : '';
  const password = typeof passwordValue === 'string' ? passwordValue : '';
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get('cf-connecting-ip')
    ?? requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';
  const fingerprint = await loginFingerprint(ipAddress, requestHeaders.get('user-agent') ?? 'unknown');
  if (await isLoginBlocked(fingerprint)) redirect('/login?error=rate');
  if (!(await credentialsAreValid(username, password))) {
    await recordFailedLogin(fingerprint);
    redirect('/login?error=1');
  }
  await clearLoginAttempts(fingerprint);
  await createSession();
  redirect('/');
}

export async function logout() {
  await clearSession();
  redirect('/login');
}
