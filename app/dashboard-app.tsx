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
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import type { Tournament } from './data/tournaments';
import { logout } from './actions';

type TournamentHistory = { tournament: string; date: string | null };
export type Member = {
  id: string;
  name: string;
  role: 'Student';
  memberType: 'Returning member';
  membershipFee: 45;
  membershipStatus: 'Unpaid';
  eventHistory: string[];
  tournamentHistory: TournamentHistory[];
};

type Tab = 'overview' | 'members' | 'tournaments' | 'payments' | 'late' | 'data';

const tabLabels: Record<Tab, string> = {
  overview: 'Overview', members: 'Members', tournaments: 'Tournaments', payments: 'Payments', late: 'Late payments', data: 'Data setup',
};

function monthHeading(date: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

function readableHistoryDate(value: string | null) {
  if (!value) return 'Date not recorded';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
}

export function DashboardApp({ members, tournaments }: { members: Member[]; tournaments: Tournament[] }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [memberSearch, setMemberSearch] = useState('');
  const [historyOnly, setHistoryOnly] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [formatFilter, setFormatFilter] = useState<'All' | Tournament['format']>('All');
  const [scheduleSearch, setScheduleSearch] = useState('');

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    return members.filter((member) =>
      (!query || member.name.toLowerCase().includes(query)) &&
      (!historyOnly || member.tournamentHistory.length > 0),
    );
  }, [historyOnly, memberSearch, members]);

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
  const withHistory = members.filter((member) => member.tournamentHistory.length > 0).length;

  const openTab = (nextTab: Tab) => {
    setTab(nextTab);
    setSelectedMember(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="app-frame">
      <aside className="sidebar">
        <div className="brand-lockup dark-lockup">
          <span className="brand-mark" aria-hidden="true">MR</span>
          <span>Speech &amp; Debate</span>
        </div>
        <nav aria-label="Dashboard navigation">
          {(Object.keys(tabLabels) as Tab[]).map((item) => (
            <button key={item} className={`nav-link ${tab === item ? 'active' : ''}`} onClick={() => openTab(item)} type="button">
              {tabLabels[item]} {item === 'members' ? <span>{members.length}</span> : null}
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
              <article className="metric-card metric-featured"><p>Returning roster</p><strong>{members.length}</strong><span>Duplicates removed from the ledger</span></article>
              <article className="metric-card"><p>Membership paid</p><strong>0 <small>/ {members.length}</small></strong><span>Returning fee: $45</span></article>
              <article className="metric-card"><p>Open deadlines</p><strong>0</strong><span>All tournament deadlines are waiting to be set</span></article>
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
                <ul><li><span>01</span>Add tournament fees and deadlines</li><li><span>02</span>Connect the payment response sheet</li><li><span>03</span>Review seniors when ready</li></ul>
              </article>
            </section>

            <section className="dashboard-section">
              <div className="section-title"><div><p className="eyebrow">Season calendar</p><h2>First four dates</h2></div><button className="outline-button" onClick={() => openTab('tournaments')} type="button">All {tournaments.length} dates</button></div>
              <div className="event-strip">
                {nextEvents.map((event) => <article key={event.id}><p>{event.dateLabel}</p><h3>{event.name}</h3><span>{event.location}</span></article>)}
              </div>
            </section>

            <section className="history-note"><History size={19} /><div><strong>{withHistory} returning members have recorded tournament history.</strong><p>The payment ledger identifies prior tournaments, but it does not contain each student’s competitive category. Those event fields are left unassigned instead of guessed.</p></div></section>
          </div>
        ) : null}

        {tab === 'members' ? (
          <div className="tab-content">
            <section className="toolbar" aria-label="Member filters">
              <label className="search-field"><Search size={17} /><input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Search 158 students" aria-label="Search students" /></label>
              <button className={`filter-button ${historyOnly ? 'selected' : ''}`} onClick={() => setHistoryOnly((value) => !value)} type="button"><History size={16} /> Has tournament history</button>
            </section>
            <div className="table-summary"><p><strong>{filteredMembers.length}</strong> students shown</p><span>All are returning members · All are unpaid</span></div>
            <div className="member-table" aria-label="Member roster">
              <div className="member-row table-head"><span>Name</span><span>Role</span><span>2026–27</span><span>History</span><span aria-hidden="true" /></div>
              {filteredMembers.map((member) => (
                <button className="member-row" key={member.id} onClick={() => setSelectedMember(member)} type="button">
                  <span className="member-name"><i>{member.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</i><b>{member.name}</b></span>
                  <span>{member.role}</span><span><em className="status-dot unpaid" /> $45 unpaid</span><span>{member.tournamentHistory.length} tournaments</span><ChevronRight size={16} />
                </button>
              ))}
              {!filteredMembers.length ? <div className="empty-row">No students match those filters.</div> : null}
            </div>
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
            <div className="schedule-note"><CalendarDays size={18} /><p><strong>{filteredTournaments.length} dates</strong> from the draft schedule. Fee and payment deadline fields are ready but intentionally unset.</p></div>
            {Object.entries(tournamentMonths).map(([month, events]) => (
              <section className="month-block" key={month}>
                <header><h2>{month}</h2><span>{events.length} dates</span></header>
                <div className="schedule-grid">
                  {events.map((event) => (
                    <article className="schedule-card" key={event.id}>
                      <div className="schedule-card-top"><span className={`kind-chip ${event.kind === 'Scrimmage' ? 'soft' : ''}`}>{event.kind}</span><span>{event.dateLabel}</span></div>
                      <h3>{event.name}</h3>
                      <p><MapPin size={15} />{event.location}</p><p><Clock3 size={15} />{event.time}</p>
                      <footer><span>{event.format}</span><b>Fee TBA · Due TBA</b></footer>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {tab === 'payments' ? (
          <div className="tab-content">
            <section className="payment-hero">
              <div><p className="eyebrow">Projected membership balance</p><strong>$7,110</strong><span>{members.length} returning members × $45</span></div>
              <div className="fee-rules"><p>2026–27 fee rules</p><dl><div><dt>Returning student</dt><dd>$45</dd></div><div><dt>New student</dt><dd>$65</dd></div></dl></div>
            </section>
            <section className="dashboard-section">
              <div className="section-title"><div><p className="eyebrow">Membership</p><h2>Current collection status</h2></div><span className="status-pill">0% collected</span></div>
              <div className="progress-track" aria-label="Zero percent of membership fees collected"><span style={{ width: '0%' }} /></div>
              <div className="payment-stats"><article><span>Paid</span><strong>$0</strong></article><article><span>Outstanding</span><strong>$7,110</strong></article><article><span>Late</span><strong>$0</strong></article></div>
            </section>
            <section className="dashboard-section compact-section">
              <div className="section-title"><div><p className="eyebrow">Tournament entry</p><h2>Waiting for fee amounts</h2></div></div>
              <p className="body-copy">Each tournament has one flat student price regardless of event. Once a fee and deadline are entered, the dashboard can match form responses against the student roster and flag missing or late payments.</p>
            </section>
          </div>
        ) : null}

        {tab === 'late' ? (
          <div className="tab-content">
            <section className="empty-state"><span className="empty-icon"><Check size={28} /></span><p className="eyebrow orange">Nothing overdue</p><h2>No late balances yet.</h2><p>Deadlines and late charges have not been entered. When they are, students will appear here automatically after a tournament deadline passes.</p></section>
            <section className="late-flow"><article><span>01</span><h3>Deadline passes</h3><p>The tournament’s due date becomes the cutoff.</p></article><article><span>02</span><h3>Payment checked</h3><p>The latest form and sheet entries are matched by student.</p></article><article><span>03</span><h3>Late fee applied</h3><p>The configured one-time or recurring charge appears here.</p></article></section>
          </div>
        ) : null}

        {tab === 'data' ? (
          <div className="tab-content">
            <section className="connection-hero"><div><p className="eyebrow">Simple automation path</p><h2>Google Form in. Dashboard out.</h2><p>This setup avoids putting a Google API key in the browser. A school-managed Sheet can remain the collection source, while the dashboard receives only the fields needed for payment matching.</p></div><span><Settings2 size={24} /> Not connected</span></section>
            <section className="connection-flow" aria-label="Proposed data connection">
              <article><span><FileSpreadsheet size={22} /></span><p>1 · Collect</p><h3>Google Form</h3><small>Student, tournament, amount, event</small></article><ChevronRight className="flow-arrow" />
              <article><span><Database size={22} /></span><p>2 · Store</p><h3>Google Sheet</h3><small>School account remains the source</small></article><ChevronRight className="flow-arrow" />
              <article><span><WalletCards size={22} /></span><p>3 · Reflect</p><h3>This dashboard</h3><small>Paid, unpaid, late, and history</small></article>
            </section>
            <section className="setup-grid">
              <article><p className="eyebrow">Already done</p><h3>Clean roster foundation</h3><ul><li><Check size={15} />158 unique returning students</li><li><Check size={15} />No purchaser emails or order numbers</li><li><Check size={15} />Prior tournament appearances retained</li></ul></article>
              <article><p className="eyebrow">Needed from you later</p><h3>Connection details</h3><ul><li><span>—</span>Google Form and response Sheet</li><li><span>—</span>Fee and deadline for each tournament</li><li><span>—</span>Late-fee rule</li></ul></article>
            </section>
            <p className="source-note">Source note: Membership and history came from the supplied Speech and Debate ledger. Tournament dates came from the supplied 2026–27 draft schedule. Obvious January–June year labels were normalized to 2027; all TBA details remain marked TBA.</p>
          </div>
        ) : null}
      </section>

      {selectedMember ? (
        <div className="drawer-backdrop">
          <aside className="member-drawer" aria-label={`${selectedMember.name} details`}>
            <button className="drawer-close" onClick={() => setSelectedMember(null)} aria-label="Close member details" type="button"><X size={20} /></button>
            <span className="drawer-avatar"><UserRound size={30} /></span><p className="eyebrow orange">Member record</p><h2>{selectedMember.name}</h2>
            <div className="member-tags"><span>Student</span><span>Returning member</span></div>
            <section className="drawer-balance"><div><span>2026–27 membership</span><strong>$45</strong></div><b><em className="status-dot unpaid" /> Unpaid</b></section>
            <section className="drawer-section"><p className="eyebrow">Competitive event</p><p className="body-copy">Not recorded in the payment ledger. This field is ready for the registration form.</p></section>
            <section className="drawer-section"><p className="eyebrow">Tournament history · {selectedMember.tournamentHistory.length}</p>
              {selectedMember.tournamentHistory.length ? <ul className="history-list">{selectedMember.tournamentHistory.map((item) => <li key={item.tournament}><span>{item.tournament}</span><small>{readableHistoryDate(item.date)}</small></li>)}</ul> : <p className="body-copy">No prior tournament payments were found for this student.</p>}
            </section>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
