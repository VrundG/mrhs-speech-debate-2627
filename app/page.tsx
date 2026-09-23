import { redirect } from 'next/navigation';
import { DashboardApp } from './dashboard-app';
import { tournaments } from './data/tournaments';
import { accountSnapshot } from './data/account-snapshot';
import { isAuthenticated } from './auth';
import { listPaymentSubmissions } from '../db/payments';
import { listChaperoneSubmissions } from '../db/chaperones';
import { listMembers } from '../db/members';
import { listIntentSubmissions } from '../db/intents';
import { listTournamentPlans } from '../db/tournament-plans';

export const dynamic = 'force-dynamic';

function privateLink(value: string | undefined) {
  return value && /^https:\/\//i.test(value) ? value : null;
}

export default async function Home() {
  if (!(await isAuthenticated())) redirect('/login');
  const [members, payments, chaperones, intents, tournamentPlans] = await Promise.all([
    listMembers(),
    listPaymentSubmissions(),
    listChaperoneSubmissions(),
    listIntentSubmissions(),
    listTournamentPlans(),
  ]);
  return <DashboardApp
    members={members}
    tournaments={tournaments}
    accountSnapshot={accountSnapshot}
    payments={payments}
    chaperones={chaperones}
    intents={intents}
    tournamentPlans={tournamentPlans}
    integrationLinks={{
      paymentForm: privateLink(process.env.MRHS_PAYMENT_FORM_URL),
      paymentSheet: privateLink(process.env.MRHS_PAYMENT_SHEET_URL),
      membershipSheet: privateLink(process.env.MRHS_MEMBERSHIP_SHEET_URL)
        ?? 'https://docs.google.com/spreadsheets/d/1ncybdNpZ_11tDP02CaSYaQlAZlRYJ1dJuWcsWqrBjxI/edit?gid=315422002#gid=315422002',
      setupSheet: privateLink(process.env.MRHS_SETUP_SHEET_URL)
        ?? 'https://docs.google.com/spreadsheets/d/1OegszqyzIeL0U_SeM2wEovTceEUqITSo4Zo2gq0l9OU/edit?gid=1555356721#gid=1555356721',
      chaperoneSheet: 'https://docs.google.com/spreadsheets/d/1t83_hjde59UwDBxsMqisNPH-iVJnFH8602RJECWJHYs/edit?gid=1914370038#gid=1914370038',
      intentSheet: 'https://docs.google.com/spreadsheets/d/16Xw9-ddqBbr_dlWBTcqituH4TjjdGFu5TPtGdGzkQBc/edit?gid=1289179386#gid=1289179386',
    }}
  />;
}
