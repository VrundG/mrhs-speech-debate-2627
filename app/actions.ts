'use server';

import { redirect } from 'next/navigation';
import { clearSession, createSession, credentialsAreValid } from './auth';

export async function login(formData: FormData) {
  const usernameValue = formData.get('username');
  const passwordValue = formData.get('password');
  const username = typeof usernameValue === 'string' ? usernameValue : '';
  const password = typeof passwordValue === 'string' ? passwordValue : '';
  if (!credentialsAreValid(username, password)) redirect('/login?error=1');
  await createSession();
  redirect('/');
}

export async function logout() {
  await clearSession();
  redirect('/login');
}
