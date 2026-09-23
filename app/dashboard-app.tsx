'use client';

import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Database,
  FileSpreadsheet,
  History,
  MapPin,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import type { Tournament } from './data/tournaments';
import type { PaymentSubmission } from '../db/payments';
import type { ChaperoneSubmission } from '../db/chaperones';
import type { Member } from '../db/members';
import type { IntentSubmission } from '../db/intents';
import type { TournamentPlan } from '../db/tournament-plans';
import { logout } from './actions';
import { resolveRosterName } from './lib/name-matcher';
import { TournamentPlanner } from './tournament-planner';

type Tab = 'overview' | 'members' | 'chaperones' | 'tournaments' | 'payments' | 'late' | 'data';
type ChaperoneFilter = 'All' | 'Has chaperone' | 'No chaperone';
type VolunteerFilter = 'All approval' | 'UCPS approved' | 'Approval needed' | 'Not recorded';
type ServiceFilter = 'All service' | 'Signed up' | 'Verified service' | 'No verified service';
type MemberSort = 'Name A–Z' | 'Most tournament history' | 'Most chaperoned';
type ChaperoneSort = 'Name A–Z' | 'Most sign-ups' | 'Most verified';
type SeasonFilter = '2026–27 active' | 'All records' | 'Inactive / alumni';
type ChaperoneRelationship = {
  parentName: string;
  tournamentNames: string[];
  confirmedTournamentNames: string[];
  signupCount: number;
  confirmedCount: number;
  approvedVolunteer: 'yes' | 'no' | 'unknown';
};
type ChaperoneDirectoryEntry = ChaperoneRelationship & { memberIds: string[] };

type IntegrationLinks = {
  paymentForm: string | null;
  paymentSheet: string | null;
  membershipSheet: string | null;
  setupSheet: string | null;
  chaperoneSheet: string | null;
  intentSheet: string | null;
};

type AccountSnapshot = {
  throughDate: string;
  transactionCount: number;
  received: number;
  expended: number;
  netChange: number;
  openingBalance: number | null;
};

const tabLabels: Record<Tab, string> = {
  overview: 'Overview', members: 'Members', chaperones: 'Chaperones', tournaments: 'Tournaments', payments: 'Payments', late: 'Late payments', data: 'Data setup',
};

const chaperoneFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSeoBgObBflXT67maLoqMM1juEjIAUxKpZ7zk3T6pVNMe3_YHA/viewform';

function monthHeading(date: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

function readableHistoryDate(value: string | null) {
  if (!value) return 'Date not recorded';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
}

function readableSubmissionDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value));
}

function parentKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ');
}

function currency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function isHttpsLink(value: string | null): value is string {
  return Boolean(value && /^https:\/\//i.test(value));
}

export function DashboardApp({ members, tournaments, payments, chaperones, intents, tournamentPlans, integrationLinks, accountSnapshot }: { members: Member[]; tournaments: Tournament[]; payments: PaymentSubmission[]; chaperones: ChaperoneSubmission[]; intents: IntentSubmission[]; tournamentPlans: TournamentPlan[]; integrationLinks: IntegrationLinks; accountSnapshot: AccountSnapshot }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [memberSearch, setMemberSearch] = useState('');
  const [historyOnly, setHistoryOnly] = useState(false);
  const [chaperoneFilter, setChaperoneFilter] = useState<ChaperoneFilter>('All');
  const [volunteerFilter, setVolunteerFilter] = useState<VolunteerFilter>('All approval');
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('All service');
  const [membershipFilter, setMembershipFilter] = useState<'All dues' | 'Paid' | 'Unpaid'>('All dues');
  const [memberTypeFilter, setMemberTypeFilter] = useState<'All members' | Member['memberType']>('All members');
  const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>('2026–27 active');
  const [memberSort, setMemberSort] = useState<MemberSort>('Name A–Z');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [chaperoneSearch, setChaperoneSearch] = useState('');
  const [directoryVolunteerFilter, setDirectoryVolunteerFilter] = useState<VolunteerFilter>('All approval');
  const [directoryServiceFilter, setDirectoryServiceFilter] = useState<ServiceFilter>('All service');
  const [chaperoneSort, setChaperoneSort] = useState<ChaperoneSort>('Name A–Z');
  const [formatFilter, setFormatFilter] = useState<'All' | Tournament['format']>('All');
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [nameTest, setNameTest] = useState('');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  const { chaperonesByMember, chaperoneDirectory } = useMemo(() => {
    const directory = new Map<string, {
      parentName: string;
      tournamentNames: Set<string>;
      confirmedTournamentNames: Set<string>;
      approvedVolunteer: ChaperoneRelationship['approvedVolunteer'];
      memberIds: Set<string>;
    }>();
    for (const submission of chaperones) {
      if (submission.studentMatchStatus !== 'matched' || !submission.memberId) continue;
      const key = parentKey(submission.parentName);
      const existing = directory.get(key);
      const approvedVolunteer = existing?.approvedVolunteer === 'yes' || submission.approvedVolunteer === 'yes'
        ? 'yes'
        : existing?.approvedVolunteer === 'no' || submission.approvedVolunteer === 'no' ? 'no' : 'unknown';
      const record = existing ?? {
        parentName: submission.parentName,
        tournamentNames: new Set<string>(),
        confirmedTournamentNames: new Set<string>(),
        approvedVolunteer,
        memberIds: new Set<string>(),
      };
      submission.tournamentNames.forEach((name) => record.tournamentNames.add(name));
      submission.confirmedTournamentNames.forEach((name) => record.confirmedTournamentNames.add(name));
      record.memberIds.add(submission.memberId);
      record.approvedVolunteer = approvedVolunteer;
      directory.set(key, record);
    }
    const relationships = Array.from(directory.values()).map((record): ChaperoneDirectoryEntry => ({
      parentName: record.parentName,
      tournamentNames: Array.from(record.tournamentNames),
      confirmedTournamentNames: Array.from(record.confirmedTournamentNames),
      signupCount: record.tournamentNames.size,
      confirmedCount: record.confirmedTournamentNames.size,
      approvedVolunteer: record.approvedVolunteer,
      memberIds: Array.from(record.memberIds),
    })).sort((a, b) => a.parentName.localeCompare(b.parentName));
    const grouped: Record<string, ChaperoneRelationship[]> = {};
    relationships.forEach((relationship) => relationship.memberIds.forEach((memberId) => {
      (grouped[memberId] ??= []).push(relationship);
    }));
    return { chaperonesByMember: grouped, chaperoneDirectory: relationships };
  }, [chaperones]);

  const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  const filteredChaperones = useMemo(() => {
    const query = chaperoneSearch.trim().toLowerCase();
    const result = chaperoneDirectory.filter((chaperone) => {
      const linkedNames = chaperone.memberIds.map((memberId) => membersById.get(memberId)?.name ?? '').filter(Boolean);
      const searchText = [chaperone.parentName, ...linkedNames, ...chaperone.tournamentNames].join(' ').toLowerCase();
      const approvalMatch = directoryVolunteerFilter === 'All approval'
        || (directoryVolunteerFilter === 'UCPS approved' && chaperone.approvedVolunteer === 'yes')
        || (directoryVolunteerFilter === 'Approval needed' && chaperone.approvedVolunteer === 'no')
        || (directoryVolunteerFilter === 'Not recorded' && chaperone.approvedVolunteer === 'unknown');
      const serviceMatch = directoryServiceFilter === 'All service'
        || (directoryServiceFilter === 'Signed up' && chaperone.signupCount > 0)
        || (directoryServiceFilter === 'Verified service' && chaperone.confirmedCount > 0)
        || (directoryServiceFilter === 'No verified service' && chaperone.confirmedCount === 0);
      return (!query || searchText.includes(query)) && approvalMatch && serviceMatch;
    });
    return result.sort((a, b) => {
      if (chaperoneSort === 'Most sign-ups') return b.signupCount - a.signupCount || a.parentName.localeCompare(b.parentName);
      if (chaperoneSort === 'Most verified') return b.confirmedCount - a.confirmedCount || b.signupCount - a.signupCount || a.parentName.localeCompare(b.parentName);
      return a.parentName.localeCompare(b.parentName);
    });
  }, [chaperoneDirectory, chaperoneSearch, chaperoneSort, directoryServiceFilter, directoryVolunteerFilter, membersById]);

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    const result = members.filter((member) => {
      const linked = chaperonesByMember[member.id] ?? [];
      const approvalMatch = volunteerFilter === 'All approval'
        || (volunteerFilter === 'UCPS approved' && linked.some((item) => item.approvedVolunteer === 'yes'))
        || (volunteerFilter === 'Approval needed' && linked.some((item) => item.approvedVolunteer === 'no'))
        || (volunteerFilter === 'Not recorded' && linked.some((item) => item.approvedVolunteer === 'unknown'));
      const serviceMatch = serviceFilter === 'All service'
        || (serviceFilter === 'Signed up' && linked.some((item) => item.signupCount > 0))
        || (serviceFilter === 'Verified service' && linked.some((item) => item.confirmedCount > 0))
        || (serviceFilter === 'No verified service' && !linked.some((item) => item.confirmedCount > 0));
      return (
      (!query || member.name.toLowerCase().includes(query)) &&
      (seasonFilter === 'All records'
        || (seasonFilter === '2026–27 active' && member.activeSeason === '2026-27')
        || (seasonFilter === 'Inactive / alumni' && member.activeSeason !== '2026-27')) &&
      (!historyOnly || member.tournamentHistory.length > 0) &&
      (membershipFilter === 'All dues' || member.membershipStatus === membershipFilter) &&
      (memberTypeFilter === 'All members' || member.memberType === memberTypeFilter) &&
      (chaperoneFilter === 'All' || (chaperoneFilter === 'Has chaperone') === Boolean(linked.length)) &&
      approvalMatch && serviceMatch
      );
    });
    return result.sort((a, b) => {
      if (memberSort === 'Most tournament history') return b.tournamentHistory.length - a.tournamentHistory.length || a.name.localeCompare(b.name);
      if (memberSort === 'Most chaperoned') {
        const count = (member: Member) => (chaperonesByMember[member.id] ?? []).reduce((sum, item) => sum + item.confirmedCount, 0);
        return count(b) - count(a) || a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
  }, [chaperoneFilter, chaperonesByMember, historyOnly, memberSearch, memberSort, memberTypeFilter, membershipFilter, members, seasonFilter, serviceFilter, volunteerFilter]);

  const filteredTournaments = useMemo(() => {
    const query = scheduleSearch.trim().toLowerCase();
    return tournaments.filter((event) =>
      (formatFilter === 'All' || event.format === formatFilter) &&
      (!query || `${event.name} ${event.location}`.toLowerCase().includes(query)),
    );
  }, [formatFilter, scheduleSearch, tournaments]);

  const tournamentMonths = useMemo(() => {
    const groups: Record<string, Tournament[]> = {};
    for (const event of filteredTournaments) (groups[monthHeading(event.startDate)] ??= []).push(event);
    return groups;
  }, [filteredTournaments]);

  const nextEvents = tournaments.slice(0, 4);
  const activeMembers = members.filter((member) => member.activeSeason === '2026-27');
  const inactiveMembers = members.filter((member) => member.activeSeason !== '2026-27');
  const paidMembers = activeMembers.filter((member) => member.membershipStatus === 'Paid');
  const returningActive = activeMembers.filter((member) => member.memberType === 'Returning member').length;
  const newActive = activeMembers.filter((member) => member.memberType === 'New member').length;
  const projectedDues = activeMembers.reduce((sum, member) => sum + member.membershipFee, 0);
  const collectedDues = paidMembers.reduce((sum, member) => sum + member.membershipFee, 0);
  const outstandingDues = projectedDues - collectedDues;
  const collectionPercent = projectedDues ? Math.round((collectedDues / projectedDues) * 100) : 0;
  const withHistory = activeMembers.filter((member) => member.tournamentHistory.length > 0).length;
  const withChaperone = members.filter((member) => chaperonesByMember[member.id]?.length).length;
  const withVerifiedChaperone = members.filter((member) => chaperonesByMember[member.id]?.some((item) => item.confirmedCount > 0)).length;
  const chaperoneSignups = chaperoneDirectory.reduce((sum, item) => sum + item.signupCount, 0);
  const verifiedChaperoneAppearances = chaperoneDirectory.reduce((sum, item) => sum + item.confirmedCount, 0);
  const approvedChaperones = chaperoneDirectory.filter((item) => item.approvedVolunteer === 'yes').length;
  const matchedPayments = payments.filter((payment) => payment.studentMatchStatus === 'matched' && ['matched', 'not_applicable'].includes(payment.tournamentMatchStatus));
  const reviewPayments = payments.filter((payment) => payment.studentMatchStatus !== 'matched' || ['review', 'unmatched'].includes(payment.tournamentMatchStatus));
  const latePayments = payments.filter((payment) => payment.paymentType.toLowerCase().includes('late'));
  const currentAccountBalance = accountSnapshot.openingBalance === null
    ? null
    : accountSnapshot.openingBalance + accountSnapshot.netChange;
  const nameMatch = useMemo(() => resolveRosterName(nameTest, members), [members, nameTest]);

  const openTab = (nextTab: Tab) => {
    setTab(nextTab);
    setSelectedMember(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="app-frame">
      <aside className="sidebar">
        <div className="brand-lockup dark-lockup">
          <img className="brand-mark" src="/marvin-logo.jpeg" alt="Marvin Ridge Mavericks" width={158} height={158} />
          <span>Speech &amp; Debate</span>
        </div>
        <nav aria-label="Dashboard navigation">
          {(Object.keys(tabLabels) as Tab[]).map((item) => (
            <button key={item} className={`nav-link ${tab === item ? 'active' : ''}`} onClick={() => openTab(item)} type="button">
              {tabLabels[item]} {item === 'members' ? <span>{activeMembers.length}</span> : item === 'chaperones' ? <span>{chaperoneDirectory.length}</span> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-season">
          <span>Current season</span>
          <strong>2026–27</strong>
        </div>
        <form action={logout}><button className="sign-out" type="submit">Sign out <ArrowUpRight size={15} /></button></form>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow orange">MRHS command center</p>
            <h1>{tabLabels[tab]}.</h1>
          </div>
          <span className="season-chip">2026–27 season</span>
        </header>

        {tab === 'overview' ? (
          <div className="tab-content">
            <section className="status-grid" aria-label="Season status">
              <article className="metric-card metric-featured"><p>2026–27 roster</p><strong>{activeMembers.length}</strong><span>{returningActive} returning · {newActive} new</span></article>
              <article className="metric-card"><p>Membership paid</p><strong>{paidMembers.length} <small>/ {activeMembers.length}</small></strong><span>{currency(collectedDues)} collected</span></article>
              <article className="metric-card"><p>Receipts received</p><strong>{payments.length}</strong><span>{matchedPayments.length} matched · {reviewPayments.length} need review</span></article>
              <article className="metric-card"><p>Account net activity</p><strong className="money-metric">{currency(accountSnapshot.netChange)}</strong><span>{currency(accountSnapshot.received)} received · {currency(accountSnapshot.expended)} spent through Sep. 17</span></article>
            </section>

            <section className="account-reconciliation">
              <div><p className="eyebrow">Account reconciliation</p><h2>{currentAccountBalance === null ? 'Beginning balance needed' : currency(currentAccountBalance)}</h2></div>
              <dl><div><dt>Transactions</dt><dd>{accountSnapshot.transactionCount}</dd></div><div><dt>Net change</dt><dd>{currency(accountSnapshot.netChange)}</dd></div><div><dt>Through</dt><dd>September 17, 2026</dd></div></dl>
              <p>The CSV proves the account changed by <strong>{currency(accountSnapshot.netChange)}</strong> during its date range. A beginning balance is required to state the current cash balance without guessing.</p>
            </section>

            <section className="overview-grid">
              <article className="next-card">
                <div className="section-heading"><div><p className="eyebrow">Up next</p><h2>{nextEvents[0]?.name}</h2></div><span className="date-tile"><b>SEP</b><strong>11</strong></span></div>
                <dl>
                  <div><dt>Dates</dt><dd>{nextEvents[0]?.dateLabel}, 2026</dd></div>
                  <div><dt>Format</dt><dd>{nextEvents[0]?.format}</dd></div>
                  <div><dt>Payment</dt><dd>Fee and deadline not set</dd></div>
                </dl>
                <button className="text-action" onClick={() => openTab('tournaments')} type="button">View complete schedule <ChevronRight size={16} /></button>
              </article>
              <article className="attention-card">
                <p className="eyebrow">Setup queue</p><h2>Ready for the new year.</h2>
                <ul><li><span>01</span>Add tournament fees and deadlines</li><li><span>02</span>Confirm chaperone service after each trip</li><li><span>03</span>Review seniors when ready</li></ul>
              </article>
            </section>

            <section className="dashboard-section">
              <div className="section-title"><div><p className="eyebrow">Season calendar</p><h2>First four dates</h2></div><button className="outline-button" onClick={() => openTab('tournaments')} type="button">All {tournaments.length} dates</button></div>
              <div className="event-strip">
                {nextEvents.map((event) => <article key={event.id}><p>{event.dateLabel}</p><h3>{event.name}</h3><span>{event.location}</span></article>)}
              </div>
            </section>

            <section className="history-note"><History size={19} /><div><strong>{withHistory} active members have recorded tournament history.</strong><p>The current form supplies each student’s prior events. Older tournament history remains attached even when a student is inactive.</p></div></section>
          </div>
        ) : null}

        {tab === 'members' ? (
          <div className="tab-content">
            <section className="member-command">
              <div className="member-command-copy"><p className="eyebrow">Roster intelligence</p><h2>Every student.<br />Every support signal.</h2><p>Find dues, experience, parent coverage, volunteer approval, and verified chaperone service without touching the underlying Sheet.</p></div>
              <div className="member-command-metrics" aria-label="Member and chaperone totals">
                <article><span>Active students</span><strong>{activeMembers.length}</strong><small>{inactiveMembers.length} retained alumni records</small></article>
                <article><span>Parent records</span><strong>{chaperoneDirectory.length}</strong><small>{chaperoneSignups} tournament sign-ups</small></article>
                <article><span>Verified</span><strong>{verifiedChaperoneAppearances}</strong><small>{withVerifiedChaperone} students supported</small></article>
              </div>
              <div className="member-command-art" aria-hidden="true" />
            </section>

            <section className="member-filter-panel" aria-label="Member filters">
              <div className="filter-panel-heading"><span><SlidersHorizontal size={16} /> Filter roster</span><button type="button" onClick={() => { setMemberSearch(''); setHistoryOnly(false); setChaperoneFilter('All'); setVolunteerFilter('All approval'); setServiceFilter('All service'); setMembershipFilter('All dues'); setMemberTypeFilter('All members'); setSeasonFilter('2026–27 active'); setMemberSort('Name A–Z'); }}>Reset all</button></div>
              <div className="member-filter-grid">
                <label className="search-field member-search"><Search size={17} /><input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder={`Search ${members.length} records`} aria-label="Search students" /></label>
                <label className="select-filter"><span>Season</span><select value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value as SeasonFilter)}><option>2026–27 active</option><option>All records</option><option>Inactive / alumni</option></select></label>
                <label className="select-filter"><span>Payment type</span><select value={memberTypeFilter} onChange={(event) => setMemberTypeFilter(event.target.value as typeof memberTypeFilter)}><option>All members</option><option value="Returning member">Returning / renewal ($45)</option><option value="New member">New / initial ($65)</option></select></label>
                <label className="select-filter"><span>Dues</span><select value={membershipFilter} onChange={(event) => setMembershipFilter(event.target.value as typeof membershipFilter)}><option>All dues</option><option>Paid</option><option>Unpaid</option></select></label>
                <label className="select-filter"><span>Parent coverage</span><select value={chaperoneFilter} onChange={(event) => setChaperoneFilter(event.target.value as ChaperoneFilter)}><option>All</option><option>Has chaperone</option><option>No chaperone</option></select></label>
                <label className="select-filter"><span>Volunteer approval</span><select value={volunteerFilter} onChange={(event) => setVolunteerFilter(event.target.value as VolunteerFilter)}><option>All approval</option><option>UCPS approved</option><option>Approval needed</option><option>Not recorded</option></select></label>
                <label className="select-filter"><span>Chaperone service</span><select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value as ServiceFilter)}><option>All service</option><option>Signed up</option><option>Verified service</option><option>No verified service</option></select></label>
                <label className="select-filter"><span>Sort by</span><select value={memberSort} onChange={(event) => setMemberSort(event.target.value as MemberSort)}><option>Name A–Z</option><option>Most tournament history</option><option>Most chaperoned</option></select></label>
              </div>
              <button className={`filter-button history-filter ${historyOnly ? 'selected' : ''}`} onClick={() => setHistoryOnly((value) => !value)} type="button"><History size={15} /> Has tournament history</button>
            </section>

            <div className="table-summary roster-summary"><p><strong>{filteredMembers.length}</strong> of {members.length} records</p><span>{activeMembers.length} active in 2026–27 · {withChaperone} have a linked parent</span></div>
            <div className="member-table" aria-label="Member roster">
              <div className="member-row table-head"><span>Student</span><span>Member</span><span>2026–27 dues</span><span>Competition</span><span>Parent support</span><span aria-hidden="true" /></div>
              {filteredMembers.map((member) => (
                <button className="member-row" key={member.id} onClick={() => setSelectedMember(member)} type="button">
                  <span className="member-name"><i>{member.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</i><span className="member-identity"><b>{member.name}</b><small>{member.activeSeason === '2026-27' ? `Active 2026–27${member.graduationYear ? ` · Class of ${member.graduationYear}` : ''}` : 'Inactive / alumni record'}</small></span></span>
                  <span>{member.memberType}</span><span><em className={`status-dot ${member.membershipStatus.toLowerCase()}`} /> ${member.membershipFee} {member.membershipStatus.toLowerCase()}</span><span><strong className="table-number">{member.tournamentHistory.length}</strong> tournaments</span>
                  <span className="chaperone-cell">{chaperonesByMember[member.id]?.length ? <><strong>{chaperonesByMember[member.id].map((item) => item.parentName).join(', ')}</strong><small>{chaperonesByMember[member.id].reduce((sum, item) => sum + item.signupCount, 0)} signed up · {chaperonesByMember[member.id].reduce((sum, item) => sum + item.confirmedCount, 0)} verified</small></> : <><strong>Needs chaperone</strong><small>No parent response linked</small></>}</span><ChevronRight size={16} />
                </button>
              ))}
              {!filteredMembers.length ? <div className="empty-row">No students match those filters.</div> : null}
            </div>
            <div className="verification-note"><ShieldCheck size={17} /><p><strong>Verified service is counted by unique tournament.</strong> Add a <b>Confirmed Tournaments</b> column to the chaperone response Sheet; this dashboard will never count a sign-up as attendance automatically.</p></div>
          </div>
        ) : null}

        {tab === 'chaperones' ? (
          <div className="tab-content">
            <section className="member-command chaperone-command">
              <div className="member-command-copy">
                <p className="eyebrow">Volunteer directory</p>
                <h2>Staff the next trip.<br />In minutes.</h2>
                <p>Find approved adults, see the students they support, and check their judging and chaperone history from one list.</p>
                <a className="hero-link" href={chaperoneFormUrl} target="_blank" rel="noreferrer">Open parent sign-up form <ArrowUpRight size={15} /></a>
              </div>
              <div className="member-command-metrics" aria-label="Chaperone directory totals">
                <article><span>Parent records</span><strong>{chaperoneDirectory.length}</strong><small>deduplicated volunteers</small></article>
                <article><span>UCPS approved</span><strong>{approvedChaperones}</strong><small>ready to assign</small></article>
                <article><span>Trip commitments</span><strong>{chaperoneSignups}</strong><small>{verifiedChaperoneAppearances} verified service</small></article>
              </div>
              <div className="member-command-art" aria-hidden="true" />
            </section>

            <section className="member-filter-panel" aria-label="Chaperone filters">
              <div className="filter-panel-heading"><span><SlidersHorizontal size={16} /> Filter chaperones</span><button type="button" onClick={() => { setChaperoneSearch(''); setDirectoryVolunteerFilter('All approval'); setDirectoryServiceFilter('All service'); setChaperoneSort('Name A–Z'); }}>Reset all</button></div>
              <div className="chaperone-filter-grid">
                <label className="search-field member-search"><Search size={17} /><input value={chaperoneSearch} onChange={(event) => setChaperoneSearch(event.target.value)} placeholder={`Search ${chaperoneDirectory.length} parents`} aria-label="Search chaperones" /></label>
                <label className="select-filter"><span>Volunteer approval</span><select value={directoryVolunteerFilter} onChange={(event) => setDirectoryVolunteerFilter(event.target.value as VolunteerFilter)}><option>All approval</option><option>UCPS approved</option><option>Approval needed</option><option>Not recorded</option></select></label>
                <label className="select-filter"><span>Chaperone service</span><select value={directoryServiceFilter} onChange={(event) => setDirectoryServiceFilter(event.target.value as ServiceFilter)}><option>All service</option><option>Signed up</option><option>Verified service</option><option>No verified service</option></select></label>
                <label className="select-filter"><span>Sort by</span><select value={chaperoneSort} onChange={(event) => setChaperoneSort(event.target.value as ChaperoneSort)}><option>Name A–Z</option><option>Most sign-ups</option><option>Most verified</option></select></label>
              </div>
            </section>

            <div className="table-summary roster-summary"><p><strong>{filteredChaperones.length}</strong> of {chaperoneDirectory.length} chaperones</p><span>{approvedChaperones} UCPS approved · {chaperoneSignups} tournament commitments</span></div>
            <div className="chaperone-directory" aria-label="Chaperone directory">
              <div className="chaperone-directory-row table-head"><span>Chaperone</span><span>UCPS status</span><span>Linked student</span><span>Tournament commitments</span><span>Verified service</span></div>
              {filteredChaperones.map((chaperone) => {
                const linkedMembers = chaperone.memberIds.map((memberId) => membersById.get(memberId)).filter((member): member is Member => Boolean(member));
                return (
                  <article className="chaperone-directory-row" key={parentKey(chaperone.parentName)}>
                    <span className="volunteer-name"><i>{chaperone.parentName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</i><b>{chaperone.parentName}</b></span>
                    <span><em className={`approval-badge ${chaperone.approvedVolunteer}`}>{chaperone.approvedVolunteer === 'yes' ? 'UCPS approved' : chaperone.approvedVolunteer === 'no' ? 'Approval needed' : 'Not recorded'}</em></span>
                    <span className="linked-students">{linkedMembers.map((member) => <button key={member.id} type="button" onClick={() => setSelectedMember(member)}>{member.name}<ChevronRight size={13} /></button>)}</span>
                    <span className="commitment-cell"><strong>{chaperone.signupCount}</strong><small>{chaperone.tournamentNames.length ? `${chaperone.tournamentNames.slice(0, 2).join(' · ')}${chaperone.tournamentNames.length > 2 ? ` · +${chaperone.tournamentNames.length - 2}` : ''}` : 'No tournament recorded'}</small></span>
                    <span className="verified-cell"><strong>{chaperone.confirmedCount}</strong><small>{chaperone.confirmedTournamentNames.length ? chaperone.confirmedTournamentNames.slice(0, 2).join(' · ') : 'Awaiting confirmation'}</small></span>
                  </article>
                );
              })}
              {!filteredChaperones.length ? <div className="empty-row">No chaperones match those filters.</div> : null}
            </div>
            <div className="verification-note"><ShieldCheck size={17} /><p><strong>Approval and service are kept separate.</strong> “UCPS approved” comes from the parent form. Verified service counts only tournaments listed in the Sheet’s <b>Confirmed Tournaments</b> column.</p></div>
          </div>
        ) : null}

        {tab === 'tournaments' ? (
          <div className="tab-content">
            <section className="toolbar stacked-mobile" aria-label="Tournament filters">
              <label className="search-field"><Search size={17} /><input value={scheduleSearch} onChange={(event) => setScheduleSearch(event.target.value)} placeholder="Search schedule" aria-label="Search tournament schedule" /></label>
              <div className="filter-group">
                {(['All', 'Online', 'In person', 'Hybrid', 'TBA'] as const).map((format) => <button key={format} className={`filter-button ${formatFilter === format ? 'selected' : ''}`} onClick={() => setFormatFilter(format)} type="button">{format}</button>)}
              </div>
            </section>
            <div className="schedule-note"><CalendarDays size={18} /><p><strong>{filteredTournaments.length} dates</strong> from the draft schedule. Select any tournament to open its live intent, judge-capacity, and roster board.</p></div>
            {Object.entries(tournamentMonths).map(([month, events]) => (
              <section className="month-block" key={month}>
                <header><h2>{month}</h2><span>{events.length} dates</span></header>
                <div className="schedule-grid">
                  {events.map((event) => (
                    <button className="schedule-card" key={event.id} onClick={() => setSelectedTournament(event)} type="button">
                      <div className="schedule-card-top"><span className={`kind-chip ${event.kind === 'Scrimmage' ? 'soft' : ''}`}>{event.kind}</span><span>{event.dateLabel}</span></div>
                      <h3>{event.name}</h3>
                      <p><MapPin size={15} />{event.location}</p><p><Clock3 size={15} />{event.time}</p>
                      <footer><span>{event.format}</span><b>{intents.filter(item => item.tournamentId === event.id).length} intent {intents.filter(item => item.tournamentId === event.id).length === 1 ? 'entry' : 'entries'} · Open board →</b></footer>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {tab === 'payments' ? (
          <div className="tab-content">
            <section className="payment-hero">
              <div><p className="eyebrow">Projected membership dues</p><strong>{currency(projectedDues)}</strong><span>{returningActive} returning × $45 · {newActive} new × $65</span></div>
              <div className="fee-rules"><p>2026–27 fee rules</p><dl><div><dt>Returning student</dt><dd>$45</dd></div><div><dt>New student</dt><dd>$65</dd></div></dl></div>
            </section>
            <section className="dashboard-section">
              <div className="section-title"><div><p className="eyebrow">Membership</p><h2>Current collection status</h2></div><span className="status-pill">{collectionPercent}% collected</span></div>
              <div className="progress-track" aria-label={`${collectionPercent} percent of membership fees collected`}><span style={{ width: `${collectionPercent}%` }} /></div>
              <div className="payment-stats"><article><span>Paid</span><strong>{currency(collectedDues)}</strong></article><article><span>Outstanding</span><strong>{currency(outstandingDues)}</strong></article><article><span>Late submissions</span><strong>{latePayments.length}</strong></article></div>
            </section>
            <section className="dashboard-section account-ledger-strip">
              <div><p className="eyebrow">School account through Sep. 17</p><h2>{currentAccountBalance === null ? 'Current balance pending' : currency(currentAccountBalance)}</h2><p>Received {currency(accountSnapshot.received)} · Expended {currency(accountSnapshot.expended)} · Net change {currency(accountSnapshot.netChange)}</p></div>
              <span>{accountSnapshot.transactionCount} ledger transactions</span>
            </section>
            <section className="dashboard-section compact-section">
              <div className="section-title"><div><p className="eyebrow">Tournament entry</p><h2>Waiting for fee amounts</h2></div></div>
              <p className="body-copy">Each tournament has one flat student price regardless of event. Once a fee and deadline are entered, the dashboard can match form responses against the student roster and flag missing or late payments.</p>
            </section>
            <section className="dashboard-section">
              <div className="section-title"><div><p className="eyebrow">Form receipts</p><h2>Submission feed</h2></div><span className="status-pill">{matchedPayments.length} matched · {reviewPayments.length} review</span></div>
              {payments.length ? <div className="payment-feed">
                {payments.map((payment) => (
                  <article className="payment-record" key={payment.id}>
                    <div><strong>{payment.matchedStudentName ?? payment.studentNameRaw}</strong><small>{readableSubmissionDate(payment.formTimestamp)}</small></div>
                    <div><span>{payment.matchedTournamentName ?? payment.tournamentNameRaw ?? payment.paymentFor}</span><small>{payment.paymentType}</small></div>
                    <span className={`match-chip ${payment.studentMatchStatus === 'matched' && ['matched', 'not_applicable'].includes(payment.tournamentMatchStatus) ? 'good' : 'review'}`}>{payment.studentMatchStatus === 'matched' && ['matched', 'not_applicable'].includes(payment.tournamentMatchStatus) ? 'Matched' : 'Review'}</span>
                    {isHttpsLink(payment.receiptUrl) ? <a href={payment.receiptUrl} target="_blank" rel="noreferrer">Receipt <ArrowUpRight size={14} /></a> : payment.receiptUrl ? <span className="receipt-missing">Receipt recorded</span> : <span className="receipt-missing">No receipt</span>}
                  </article>
                ))}
              </div> : <div className="inline-empty"><p>No form submissions yet.</p><span>The first receipt will appear here automatically after the Sheet trigger is installed.</span></div>}
            </section>
          </div>
        ) : null}

        {tab === 'late' ? (
          <div className="tab-content">
            {latePayments.length ? <section className="dashboard-section late-submissions">
              <div className="section-title"><div><p className="eyebrow">Submitted as late</p><h2>{latePayments.length} late payment{latePayments.length === 1 ? '' : 's'}</h2></div></div>
              {latePayments.map((payment) => <article key={payment.id}><strong>{payment.matchedStudentName ?? payment.studentNameRaw}</strong><span>{payment.matchedTournamentName ?? payment.tournamentNameRaw ?? payment.paymentFor}</span><small>{readableSubmissionDate(payment.formTimestamp)}</small></article>)}
            </section> : <section className="empty-state"><span className="empty-icon"><Check size={28} /></span><p className="eyebrow orange">Nothing overdue</p><h2>No late balances yet.</h2><p>Deadlines and late charges have not been entered. When they are, students will appear here automatically after a tournament deadline passes.</p></section>}
            <section className="late-flow"><article><span>01</span><h3>Deadline passes</h3><p>The tournament’s due date becomes the cutoff.</p></article><article><span>02</span><h3>Payment checked</h3><p>The latest form and sheet entries are matched by student.</p></article><article><span>03</span><h3>Late fee applied</h3><p>The configured one-time or recurring charge appears here.</p></article></section>
          </div>
        ) : null}

        {tab === 'data' ? (
          <div className="tab-content">
            <section className="connection-hero"><div><p className="eyebrow">Automatic data path</p><h2>Forms in. Dashboard out.</h2><p>Membership, account setup, payments, chaperones, and tournament intent each use a private server endpoint. No Google API key is exposed in the browser.</p></div><span><Settings2 size={24} /> Five sources</span></section>
            <section className="connection-flow" aria-label="Proposed data connection">
              <article><span><FileSpreadsheet size={22} /></span><p>1 · Collect</p><h3>Google Form</h3><small>Free-text student name, payment details, receipt</small>{integrationLinks.paymentForm ? <a className="data-link" href={integrationLinks.paymentForm} target="_blank" rel="noreferrer">Open payment form <ArrowUpRight size={14} /></a> : <span className="data-link">Link configured privately</span>}</article><ChevronRight className="flow-arrow" />
              <article><span><Database size={22} /></span><p>2 · Store</p><h3>Google Sheet</h3><small>Seven response fields confirmed</small>{integrationLinks.paymentSheet ? <a className="data-link" href={integrationLinks.paymentSheet} target="_blank" rel="noreferrer">Open response Sheet <ArrowUpRight size={14} /></a> : <span className="data-link">Link configured privately</span>}</article><ChevronRight className="flow-arrow" />
              <article><span><WalletCards size={22} /></span><p>3 · Reflect</p><h3>This dashboard</h3><small>Paid, unpaid, late, and history</small></article>
            </section>
            <section className="source-grid" aria-label="Connected response sheets">
              <article><p className="eyebrow">2026–27 roster</p><h3>Membership responses</h3><strong>{activeMembers.length}</strong><span>active students after deduplication</span>{integrationLinks.membershipSheet ? <a className="data-link" href={integrationLinks.membershipSheet} target="_blank" rel="noreferrer">Open membership Sheet <ArrowUpRight size={14} /></a> : null}</article>
              <article><p className="eyebrow">Student accounts</p><h3>Tabroom + NSDA setup</h3><strong>{members.filter((member) => member.tabroomEmail || member.nsdaEmail).length}</strong><span>students with account details</span>{integrationLinks.setupSheet ? <a className="data-link" href={integrationLinks.setupSheet} target="_blank" rel="noreferrer">Open setup Sheet <ArrowUpRight size={14} /></a> : null}</article>
              <article><p className="eyebrow">Payment proof</p><h3>Receipt submissions</h3><strong>{payments.length}</strong><span>{matchedPayments.length} matched automatically</span>{integrationLinks.paymentSheet ? <a className="data-link" href={integrationLinks.paymentSheet} target="_blank" rel="noreferrer">Open payment Sheet <ArrowUpRight size={14} /></a> : null}</article>
              <article><p className="eyebrow">Tournament intent</p><h3>Student registration</h3><strong>{intents.length}</strong><span>event entries connected to tournament boards</span>{integrationLinks.intentSheet ? <a className="data-link" href={integrationLinks.intentSheet} target="_blank" rel="noreferrer">Open intent Sheet <ArrowUpRight size={14} /></a> : null}</article>
              <article><p className="eyebrow">Adult coverage</p><h3>Judge + chaperone sign-up</h3><strong>{chaperoneDirectory.length}</strong><span>deduplicated long-term volunteers</span>{integrationLinks.chaperoneSheet ? <a className="data-link" href={integrationLinks.chaperoneSheet} target="_blank" rel="noreferrer">Open chaperone Sheet <ArrowUpRight size={14} /></a> : null}</article>
            </section>
            <section className="setup-grid">
              <article><p className="eyebrow">Data rules</p><h3>Records stay useful</h3><ul><li><Check size={15} />Active students come from the 2026–27 form</li><li><Check size={15} />Inactive students remain searchable</li><li><Check size={15} />Parents stay linked for future chaperoning</li><li><Check size={15} />Tabroom and NSDA details remain login-only</li></ul></article>
              <article><p className="eyebrow">Still needed</p><h3>Finish the financial picture</h3><ul><li><span>—</span>Beginning account balance before March 1</li><li><span>—</span>Fee and deadline for each tournament</li><li><span>—</span>Late-fee rule</li></ul></article>
            </section>
            <section className="name-matcher">
              <div><p className="eyebrow">Free-text matching</p><h2>No dropdown required.</h2><p>Names are cleaned for capitalization, extra spaces, punctuation, accents, and “last name, first name” order. Confident spelling mistakes are matched automatically; uncertain entries wait for review instead of being attached to the wrong student.</p></div>
              <div className="matcher-demo">
                <label htmlFor="name-test">Try a student name</label>
                <input id="name-test" value={nameTest} onChange={(event) => setNameTest(event.target.value)} placeholder="Type it as a student might" />
                {nameMatch.status === 'empty' ? <p className="match-muted">Example: extra spaces, lowercase, or a small typo.</p> : null}
                {nameMatch.status === 'matched' ? <div className="match-result matched"><span><Check size={16} /> Matched</span><strong>{nameMatch.member.name}</strong><small>{Math.round(nameMatch.confidence * 100)}% confidence · {nameMatch.method}</small></div> : null}
                {nameMatch.status === 'review' ? <div className="match-result review"><span>Needs review</span><strong>{nameMatch.suggestions[0]?.name ?? 'No safe match'}</strong><small>{nameMatch.suggestions.length ? `Possible: ${nameMatch.suggestions.map((member) => member.name).join(', ')}` : 'No roster suggestions'}</small></div> : null}
                {nameMatch.status === 'unmatched' ? <div className="match-result review"><span>Not matched</span><strong>Leave unassigned</strong><small>The submission stays in the review queue.</small></div> : null}
              </div>
            </section>
            <p className="source-note">Source note: The current roster comes from the 2026–27 membership response Sheet. Account readiness comes from the member setup Sheet. Older students, tournament history, and chaperone links remain retained. The account CSV covers March 1 through September 17, 2026 and shows a net change of {currency(accountSnapshot.netChange)}; it does not include the beginning balance.</p>
          </div>
        ) : null}
      </section>

      {selectedMember ? (
        <div className="drawer-backdrop">
          <aside className="member-drawer" aria-label={`${selectedMember.name} details`}>
            <button className="drawer-close" onClick={() => setSelectedMember(null)} aria-label="Close member details" type="button"><X size={20} /></button>
            <span className="drawer-avatar"><UserRound size={30} /></span><p className="eyebrow orange">Member record</p><h2>{selectedMember.name}</h2>
            <div className="member-tags"><span>Student</span><span>{selectedMember.memberType}</span><span>{selectedMember.activeSeason === '2026-27' ? 'Active 2026–27' : 'Inactive / alumni'}</span>{selectedMember.graduationYear ? <span>Class of {selectedMember.graduationYear}</span> : null}</div>
            <section className="drawer-balance"><div><span>2026–27 membership</span><strong>${selectedMember.membershipFee}</strong></div><b><em className={`status-dot ${selectedMember.membershipStatus.toLowerCase()}`} /> {selectedMember.membershipStatus}</b></section>
            <section className="drawer-section"><p className="eyebrow">Tabroom + NSDA</p>
              <div className="account-readiness">
                <article><span>Tabroom</span><strong>{selectedMember.tabroomAccountCreated === 'yes' ? 'Set up' : selectedMember.tabroomAccountCreated === 'no' ? 'Needs setup' : 'Not recorded'}</strong><small>{selectedMember.tabroomEmail ?? 'No email recorded'}</small></article>
                <article><span>NSDA</span><strong>{selectedMember.nsdaAccountCreated === 'yes' ? 'Set up' : selectedMember.nsdaAccountCreated === 'no' ? 'Needs setup' : 'Not recorded'}</strong><small>{selectedMember.nsdaEmail ?? 'No email recorded'}</small></article>
              </div>
              {selectedMember.jbJwLinked ? <p className="profile-note">JB/JW linked: <strong>{selectedMember.jbJwLinked}</strong></p> : null}
            </section>
            <section className="drawer-section"><p className="eyebrow">Member contact</p><dl className="profile-list"><div><dt>School email</dt><dd>{selectedMember.schoolEmail ?? 'Not recorded'}</dd></div><div><dt>Personal email</dt><dd>{selectedMember.personalEmail ?? 'Not recorded'}</dd></div><div><dt>Phone</dt><dd>{selectedMember.phoneNumber ?? 'Not recorded'}</dd></div><div><dt>Shirt</dt><dd>{selectedMember.shirtSize ?? 'Not recorded'}</dd></div></dl></section>
            <section className="drawer-section"><p className="eyebrow">Parent chaperone · {chaperonesByMember[selectedMember.id]?.length ?? 0}</p>
              {chaperonesByMember[selectedMember.id]?.length ? <ul className="chaperone-list">{chaperonesByMember[selectedMember.id].map((item) => <li key={item.parentName}><strong>{item.parentName}</strong><span>{item.approvedVolunteer === 'yes' ? 'UCPS approved' : item.approvedVolunteer === 'no' ? 'UCPS approval pending' : 'Approval not recorded'}</span><div className="chaperone-counts"><b><strong>{item.signupCount}</strong> signed up</b><b><strong>{item.confirmedCount}</strong> verified</b></div><small>{item.confirmedTournamentNames.length ? `Confirmed: ${item.confirmedTournamentNames.join(' · ')}` : item.tournamentNames.length ? `Signed up: ${item.tournamentNames.join(' · ')}` : 'Tournament not recorded'}</small></li>)}</ul> : <p className="body-copy">No parent response has been matched to this student.</p>}
            </section>
            <section className="drawer-section"><p className="eyebrow">Competitive events</p><p className="body-copy">{Array.from(new Set([...selectedMember.priorEvents, ...selectedMember.eventHistory])).join(' · ') || 'No prior event recorded.'}</p></section>
            <section className="drawer-section"><p className="eyebrow">Tournament history · {selectedMember.tournamentHistory.length}</p>
              {selectedMember.tournamentHistory.length ? <ul className="history-list">{selectedMember.tournamentHistory.map((item) => <li key={item.tournament}><span>{item.tournament}</span><small>{readableHistoryDate(item.date)}</small></li>)}</ul> : <p className="body-copy">No prior tournament payments were found for this student.</p>}
            </section>
          </aside>
        </div>
      ) : null}
      {selectedTournament ? <TournamentPlanner tournament={selectedTournament} tournaments={tournaments} intents={intents} chaperones={chaperones} members={members} initialPlan={tournamentPlans.find(plan => plan.tournamentId === selectedTournament.id) ?? null} onClose={() => setSelectedTournament(null)} /> : null}
    </main>
  );
}
