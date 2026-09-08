import { redirect } from 'next/navigation';
import { DashboardApp, type Member } from './dashboard-app';
import membersData from './data/members.generated.json';
import { tournaments } from './data/tournaments';
import { isAuthenticated } from './auth';
import { listPaymentSubmissions } from '../db/payments';

export const dynamic = 'force-dynamic';

export default async function Home() {
  if (!(await isAuthenticated())) redirect('/login');
  const payments = await listPaymentSubmissions();
  return <DashboardApp members={membersData as Member[]} tournaments={tournaments} payments={payments} />;
}
