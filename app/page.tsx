import { redirect } from 'next/navigation';
import { DashboardApp } from './dashboard-app';
import { tournaments } from './data/tournaments';
import { isAuthenticated } from './auth';
import { listPaymentSubmissions } from '../db/payments';
import { listChaperoneSubmissions } from '../db/chaperones';
import { listMembers } from '../db/members';

export const dynamic = 'force-dynamic';

function privateLink(value: string | undefined) {
  return value && /^https:\/\//i.test(value) ? value : null;
}

export default async function Home() {
  if (!(await isAuthenticated())) redirect('/login');
  const [members, payments, chaperones] = await Promise.all([
    listMembers(),
    listPaymentSubmissions(),
    listChaperoneSubmissions(),
  ]);
  return <DashboardApp
    members={members}
    tournaments={tournaments}
    payments={payments}
    chaperones={chaperones}
    integrationLinks={{
      paymentForm: privateLink(process.env.MRHS_PAYMENT_FORM_URL),
      paymentSheet: privateLink(process.env.MRHS_PAYMENT_SHEET_URL),
    }}
  />;
}
