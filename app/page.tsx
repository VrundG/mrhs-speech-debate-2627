import { redirect } from 'next/navigation';
import { DashboardApp, type Member } from './dashboard-app';
import membersData from './data/members.generated.json';
import { tournaments } from './data/tournaments';
import { isAuthenticated } from './auth';
import { listPaymentSubmissions } from '../db/payments';
import { listChaperoneSubmissions } from '../db/chaperones';

export const dynamic = 'force-dynamic';

export default async function Home() {
  if (!(await isAuthenticated())) redirect('/login');
  const [payments, chaperones] = await Promise.all([listPaymentSubmissions(), listChaperoneSubmissions()]);
  return <DashboardApp members={membersData as Member[]} tournaments={tournaments} payments={payments} chaperones={chaperones} />;
}
