export type Tournament = {
  id: string;
  startDate: string;
  endDate?: string;
  dateLabel: string;
  time: string;
  name: string;
  location: string;
  format: 'Online' | 'In person' | 'Hybrid' | 'TBA';
  kind: 'Tournament' | 'Scrimmage' | 'Team event';
  fee: null;
  paymentDeadline: null;
};

const tournament = (
  id: string,
  startDate: string,
  dateLabel: string,
  time: string,
  name: string,
  location: string,
  format: Tournament['format'],
  kind: Tournament['kind'] = 'Tournament',
  endDate?: string,
): Tournament => ({ id, startDate, endDate, dateLabel, time, name, location, format, kind, fee: null, paymentDeadline: null });

export const tournaments: Tournament[] = [
  tournament('season-opener','2026-09-11','Sep 11–13','Varied','NSDA Season Opener','Online','Online','Tournament','2026-09-13'),
  tournament('grey-matter','2026-09-18','Sep 18–19','Friday evening–Saturday','Cary Academy Grey Matter Invitational','Online or Cary, NC','Hybrid','Tournament','2026-09-19'),
  tournament('peach-fuzz','2026-09-19','Sep 19','8:30 AM–4:00 PM','Peach Fuzz Speech & Debate Tournament','Online','Online'),
  tournament('springboard-1','2026-09-24','Sep 24','7:00–9:00 PM ET','NSDA Springboard Scrimmage 1','Online','Online','Scrimmage'),
  tournament('myers-park-tutorial','2026-09-30','TBA','All day','Myers Park Tutorial','Charlotte, NC','In person','Team event'),
  tournament('yale','2026-10-02','Oct 2–4','Varied','Yale Invitational','New Haven, CT and online','Hybrid','Tournament','2026-10-04'),
  tournament('springboard-2','2026-10-08','Oct 8','7:00–9:00 PM ET','NSDA Springboard Scrimmage 2','Online','Online','Scrimmage'),
  tournament('georgetown','2026-10-09','Oct 9–11','Friday evening–Sunday','Georgetown Fall Online','Online','Online','Tournament','2026-10-11'),
  tournament('north-meck','2026-10-10','Oct 10','All day','N. Mecklenburg Viking Classic','Huntersville, NC','In person'),
  tournament('springboard-3','2026-10-13','Oct 13','7:00–9:00 PM ET','NSDA Springboard Scrimmage 3','Online','Online','Scrimmage'),
  tournament('springboard-4','2026-10-15','Oct 15','Time TBA','NSDA Springboard Scrimmage 4','Online','Online','Scrimmage'),
  tournament('fall-scrimmage','2026-10-17','Oct 17','8:00 AM–6:00 PM','MRHS Fall Scrimmage','Marvin, NC','In person','Scrimmage'),
  tournament('harvard-uk-toc-oct','2026-10-23','Oct 23–25','All day','Harvard Debate UKTOC International Qualifier','Online / hybrid TBA','TBA','Tournament','2026-10-25'),
  tournament('laird-lewis','2026-10-23','Oct 23–24','All day','Laird Lewis at Myers Park High School','Charlotte, NC','In person','Tournament','2026-10-24'),
  tournament('springboard-5','2026-10-27','Oct 27','Time TBA','NSDA Springboard Scrimmage 5','Online','Online','Scrimmage'),
  tournament('michigan','2026-10-28','Oct 28–Nov 1','Varied / all day','University of Michigan High School Debate Tournament','Online rounds; full Policy in person','Hybrid','Tournament','2026-11-01'),
  tournament('blue-key','2026-10-30','Oct 30–Nov 2','Begins Friday at 3:30 PM','Florida Blue Key Speech & Debate Tournament','Gainesville, FL','In person','Tournament','2026-11-02'),
  tournament('corona','2026-11-07','Nov 7','7:15 AM–8:00 PM','Corona Rostrensis at Charlotte Latin','Charlotte, NC','In person'),
  tournament('springboard-6','2026-11-05','Nov 5','Time TBA','NSDA Springboard Scrimmage 6','Online','Online','Scrimmage'),
  tournament('springboard-7','2026-11-10','Nov 10','6:30–9:00 PM ET','NSDA Springboard Scrimmage 7','Online','Online','Scrimmage'),
  tournament('springboard-8','2026-11-17','Nov 17','6:30–9:00 PM ET','NSDA Springboard Scrimmage 8','Online','Online','Scrimmage'),
  tournament('carrollton','2026-11-13','Nov 13–15','Time TBA','Carrollton tournament — name TBA','Carrollton, GA','Hybrid','Tournament','2026-11-15'),
  tournament('riverside','2026-11-14','Nov 14','All day','Riverside, SC Tournament','South Carolina','In person'),
  tournament('springboard-9','2026-11-19','Nov 19','6:30–9:00 PM ET','NSDA Springboard Scrimmage 9','Online','Online','Scrimmage'),
  tournament('harvard-uk-toc-nov','2026-11-20','Nov 20–22','All day','Harvard Debate UKTOC International Qualifier','Online / hybrid TBA','TBA','Tournament','2026-11-22'),
  tournament('asheville','2026-11-21','Nov 21','5:00 AM–11:00 PM','Cougar Classic at Asheville High School','Asheville, NC','In person'),
  tournament('toc-online','2026-12-04','Dec 4–6','Three days','TOC Online — event TBA','Online','Online','Tournament','2026-12-06'),
  tournament('marvin-ridge','2026-12-12','Dec 12','All day','Marvin Ridge Tournament','Waxhaw, NC','In person'),
  tournament('world-schools-open','2026-12-19','Dec 19','Time TBA','World Schools Open at Myers Park','Charlotte, NC','In person'),
  tournament('south-carolina-tba','2027-01-09','Jan 9','Time TBA','South Carolina event — name TBA','South Carolina','TBA'),
  tournament('springboard-10','2027-01-13','Jan 13','6:30–9:00 PM ET','NSDA Springboard Scrimmage 10','Online','Online','Scrimmage'),
  tournament('springboard-11','2027-01-15','Jan 15','6:30–9:00 PM ET','NSDA Springboard Scrimmage 11','Online','Online','Scrimmage'),
  tournament('cavalier','2027-01-15','Jan 15–18','Three-day trip','Cavalier Invitational at Durham Academy','Durham, NC','In person','Tournament','2027-01-18'),
  tournament('springboard-12','2027-01-22','Jan 22','6:30–9:00 PM ET','NSDA Springboard Scrimmage 12','Online','Online','Scrimmage'),
  tournament('emory','2027-01-22','Jan 22–24','Begins Friday at 4:30 PM','Barkley Forum at Emory University','Atlanta, GA','In person','Tournament','2027-01-24'),
  tournament('springboard-13','2027-01-27','Jan 27','6:30–9:00 PM ET','NSDA Springboard Scrimmage 13','Online','Online','Scrimmage'),
  tournament('columbia','2027-01-29','Jan 29–31','Three days','Columbia University Online Invitational','Online','Online','Tournament','2027-01-31'),
  tournament('ballantyne','2027-01-30','Jan 30','All day','Ballantyne Ridge Tournament','Charlotte, NC','In person'),
  tournament('stanford','2027-02-06','Feb 6–8','Three days','Stanford Online Invitational','Online','Online','Tournament','2027-02-08'),
  tournament('springboard-14','2027-02-10','Feb 10','6:30–9:00 PM ET','NSDA Springboard Scrimmage 14','Online','Online','Scrimmage'),
  tournament('springboard-15','2027-02-12','Feb 12','6:30–9:00 PM ET','NSDA Springboard Scrimmage 15','Online','Online','Scrimmage'),
  tournament('cal','2027-02-13','Feb 13–15','All day','Cal Invitational at UC Berkeley','Online','Online','Tournament','2027-02-15'),
  tournament('harvard-national','2027-02-13','Feb 13–15','All day','Harvard National Speech & Debate Tournament','Cambridge, MA','In person','Tournament','2027-02-15'),
  tournament('cuthbertson','2027-02-20','Feb 20','All day','Cuthbertson Classic at Cuthbertson High School','Waxhaw, NC','In person'),
  tournament('springboard-16','2027-02-24','Feb 24','6:30–9:00 PM ET','NSDA Springboard Scrimmage 16','Online','Online','Scrimmage'),
  tournament('reagan-qa','2027-02-25','TBA','3:00 PM PT / 6:00 PM ET','Ronald Reagan Debate Series Q&A','Zoom','Online','Team event'),
  tournament('springboard-17','2027-02-26','Feb 26','6:30–9:00 PM ET','NSDA Springboard Scrimmage 17','Online','Online','Scrimmage'),
  tournament('ardrey-kell','2027-02-27','Feb 27','All day','Ardrey Kell Tournament','Charlotte, NC','In person'),
  tournament('districts','2027-03-06','Mar 6–7','Two days','Carolina West Districts','Location TBA within district','TBA','Tournament','2027-03-07'),
  tournament('springboard-18','2027-03-10','Mar 10','6:30–9:00 PM ET','NSDA Springboard Scrimmage 18','Online','Online','Scrimmage'),
  tournament('springboard-19','2027-03-12','Mar 12','6:30–9:00 PM ET','NSDA Springboard Scrimmage 19','Online','Online','Scrimmage'),
  tournament('springboard-20','2027-03-19','Mar 19','6:30–9:00 PM ET','NSDA Springboard Scrimmage 20','Online','Online','Scrimmage'),
  tournament('reagan-richmond','2027-03-21','Mar 21','All day','Ronald Reagan Debate Series Regional','Collegiate School, Richmond, VA','In person'),
  tournament('springboard-21','2027-03-24','Mar 24','6:30–9:00 PM ET','NSDA Springboard Scrimmage 21','Online','Online','Scrimmage'),
  tournament('tfl-state','2027-04-09','Apr 9–11','Friday evening–Sunday','TFL State Championship','UNC Chapel Hill — location TBA','TBA','Tournament','2027-04-11'),
  tournament('reagan-vanderbilt','2027-04-11','Apr 11','All day','Ronald Reagan Debate Series Regional','Vanderbilt University, Nashville, TN','In person'),
  tournament('uk-toc','2027-04-17','Apr 17–19','All day','University of Kentucky Tournament of Champions','Lexington, KY','In person','Tournament','2027-04-19'),
  tournament('spring-scrimmage','2027-04-25','Date TBA','All day','MRHS Spring Scrimmage Invitational','Marvin Ridge High School','In person','Scrimmage'),
  tournament('banquet','2027-05-18','Date TBA','6:30 PM','MRHS Year-End Banquet and Awards','Waxhaw, NC','In person','Team event'),
  tournament('vancouver-wsdc','2027-05-16','May 16–17','All day','Vancouver Online WSDC — participation TBA','Online','Online','Tournament','2027-05-17'),
  tournament('ncfl','2027-05-28','May 28–31','Three- to four-day trip','NCFL Grand Nationals','Minneapolis, MN','In person','Tournament','2027-05-31'),
  tournament('reagan-online','2027-06-05','Jun 5–6','Two days','Ronald Reagan Debate Series Online','Online','Online','Tournament','2027-06-06'),
  tournament('nsda-nationals','2027-06-12','Jun 12–20','Seven-day trip','NSDA National Tournament','Phoenix, AZ','In person','Tournament','2027-06-20'),
  tournament('reagan-nationals','2027-06-21','Date TBA','Three- to four-day trip','Ronald Reagan Debate Nationals','Simi Valley / Los Angeles, CA','In person'),
].sort((a, b) => a.startDate.localeCompare(b.startDate));
