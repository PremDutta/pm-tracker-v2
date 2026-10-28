import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { WHATS_NEW } from './data/whatsNew';
import * as clock from './clock';

beforeEach(() => {
  window.localStorage.clear();
  // jsdom doesn't implement the Clipboard API or window.open — several
  // buttons call these, so stub them out to avoid noisy console errors.
  // navigator.clipboard is a getter-only property in this jsdom version,
  // so it needs defineProperty rather than a plain assign.
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: jest.fn(() => Promise.resolve()) },
    configurable: true,
  });
  window.open = jest.fn();
  // jsdom doesn't implement scrolling; "Go to feature" scrolls to the section.
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
  // The Govt & PSU tab loads live openings from GitHub; tests never hit the network.
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ openings: [] }) }));
  // Every release already acknowledged, so the announcement dialog stays out of
  // the way; the announcement tests clear this themselves.
  window.localStorage.setItem('pmt_seen_releases', JSON.stringify(WHATS_NEW.map(f => f.id)));
});

const isoDaysFromToday = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test('renders the home page without crashing', () => {
  render(<App />);
  expect(screen.getByText('PM Jobs Tracker')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Every PM role in India\.\s*Found before the crowd\./ })).toBeInTheDocument();
  expect(screen.getByText(/Live · \d+ companies, YC & \d+ govt orgs scanned every 6 hours/)).toBeInTheDocument();
});

test('Govt & PSU: filters orgs, and opening a careers page records it as checked', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole('button', { name: 'Govt & PSU' }));
  expect(screen.getByRole('heading', { name: 'Government & PSU' })).toBeInTheDocument();
  expect(await screen.findByText('65 manual-check orgs not checked in 7 days')).toBeInTheDocument();

  // Search narrows the directory to the matching org
  await user.type(screen.getByLabelText('Search government organisations'), 'NPCI');
  const npciCareers = screen.getByRole('link', { name: 'NPCI careers page' });
  expect(npciCareers).toHaveAttribute('href', 'https://careers.npci.org.in/jobs/Careers');
  expect(screen.queryByRole('link', { name: 'ONDC careers page' })).not.toBeInTheDocument();

  // Clicking through stamps "last checked" in the shared platform meta store
  fireEvent.click(npciCareers);
  const meta = JSON.parse(window.localStorage.getItem('pmt_platform_meta'));
  expect(meta['govt-npci'].lastChecked).toBeGreaterThan(0);
  expect(screen.getByText('Checked just now')).toBeInTheDocument();
  expect(screen.getByText('64 manual-check orgs not checked in 7 days')).toBeInTheDocument();
});

test('Govt & PSU: shows live openings by deadline, and hides closed ones', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ openings: [
    { id: 'govt-npci-1', title: 'Lead Product Management', company: 'NPCI Bharat BillPay Ltd', location: 'Mumbai', url: 'https://careers.npci.org.in/jobs/1', deadline: null, flags: [], org: 'NPCI', firstSeen: '2026-01-01' },
    { id: 'govt-dic-ora-7', title: 'Technical Product Manager', company: 'NeGD', location: 'Delhi', url: 'https://ora.digitalindiacorporation.in/?job=7', deadline: isoDaysFromToday(2), flags: ['mba_mentioned', 'contract'], org: 'DIC ORA', firstSeen: isoDaysFromToday(0) },
    { id: 'govt-rbih-old', title: 'Product Manager (closed)', company: 'RBIH', location: 'Bengaluru', url: 'https://rbihub.in/career/old/', deadline: isoDaysFromToday(-1), flags: [], org: 'RBIH', firstSeen: '2026-01-01' },
  ] }) }));
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Govt & PSU' }));

  expect(await screen.findByText('2 open')).toBeInTheDocument();
  expect(screen.queryByText('Product Manager (closed)')).not.toBeInTheDocument();
  // Soonest deadline first, with its urgency, NEW and eligibility badges
  const titles = [...document.querySelectorAll('a')].filter(a => a.textContent.startsWith('Apply')).map(a => a.getAttribute('href'));
  expect(titles[0]).toBe('https://ora.digitalindiacorporation.in/?job=7');
  expect(screen.getByText('CLOSES IN 2D')).toBeInTheDocument();
  expect(screen.getByText('NEW ROLE')).toBeInTheDocument();
  expect(screen.getByText('MBA asked')).toBeInTheDocument();

});

test('Govt & PSU: orgs the scanner read are marked auto-scanned and leave the manual count; duplicate postings are grouped', async () => {
  const dup = { title: 'Senior Lead Product Development', company: 'NPCI Bharat BillPay Ltd', location: 'Mumbai', deadline: null, flags: [], org: 'NPCI', firstSeen: '2026-01-01' };
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({
    openings: [{ ...dup, id: 'govt-npci-1', url: 'https://careers.npci.org.in/jobs/1' }, { ...dup, id: 'govt-npci-2', url: 'https://careers.npci.org.in/jobs/2' }],
    lastRead: { NPCI: isoDaysFromToday(0), ONDC: isoDaysFromToday(-10) },
  }) }));
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Govt & PSU' }));

  expect(await screen.findByText('1 open')).toBeInTheDocument();
  expect(screen.getByText('×2 OPENINGS')).toBeInTheDocument();
  // NPCI read today, plus NBBL and NIPL which are listed on NPCI's portal; ONDC's read is too old
  expect(screen.getAllByText('✓ Auto-scanned')).toHaveLength(3);
  expect(screen.getByText('62 manual-check orgs not checked in 7 days')).toBeInTheDocument();
});

test('Govt & PSU: a failed live-openings fetch still leaves the directory usable', async () => {
  global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Govt & PSU' }));
  expect(await screen.findByText(/Couldn't load live openings/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'NPCI careers page' })).toBeInTheDocument();
});

test('Resume Match: matches a key phrase present in both, flags one missing from the resume', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole('button', { name: /Resume Match/i }));
  await user.type(screen.getByPlaceholderText(/Paste your resume text/i), 'Experienced product manager who ships features and leads teams.');
  await user.type(screen.getByPlaceholderText(/Paste the job description/i), 'Looking for a product manager with strong kubernetes and blockchain experience.');

  // "product manager" is extracted as a 2-word phrase (not two independent
  // words) and is present in both — confirmed present:true via direct script
  // run against resumeAnalysis.js before writing this assertion.
  expect(await screen.findByText('product manager')).toBeInTheDocument();
  // "blockchain experience" never appears in the resume at all
  expect(screen.getByText('blockchain experience')).toBeInTheDocument();
});

test('Resume Match: stemming matches "managed" against the JD\'s "managing", and the experience-years check fires', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole('button', { name: /Resume Match/i }));
  await user.type(screen.getByPlaceholderText(/Paste your resume text/i), 'I managed teams and worked with SQL databases for 6 years, 2018-2024.');
  await user.type(screen.getByPlaceholderText(/Paste the job description/i), 'Looking for someone with 5+ years managing teams. Must have experience with SQL and stakeholder management.');

  // "managed teams" (resume) and "managing teams" (JD) stem to the same
  // root, so this phrase should show as present, not missing — this is the
  // whole point of adding stemming instead of exact string matching.
  expect(await screen.findByText('managing teams')).toBeInTheDocument();
  // Real output confirmed via script: JD asks for 5+, resume spans 6 (meets the bar)
  expect(screen.getByText(/JD asks for/i).textContent).toMatch(/5\+ years.*6 years.*2018–2024.*meets the bar/i);
});

test('Resume Match: experience-years check ignores a college graduation year, using only the Experience section', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole('button', { name: /Resume Match/i }));
  fireEvent.change(screen.getByPlaceholderText(/Paste your resume text/i), { target: { value:
    'Education\nB.Tech Computer Science, IIT Delhi, 2010-2014\n\n' +
    'Experience\nSenior Product Manager, Acme Corp, 2020-Present\nProduct Manager, Beta Inc, 2018-2020'
  } });
  await user.type(screen.getByPlaceholderText(/Paste the job description/i), 'Looking for a candidate with 5+ years of product management experience.');

  // Real bug this guards against: a plain year-regex over the whole resume
  // would have picked up the 2010 college start date, inflating the span to
  // ~15 years instead of the real ~8 years of actual work experience.
  expect(await screen.findByText(/JD asks for/i)).toHaveTextContent(/5\+ years.*8 years.*2018–Present.*meets the bar/i);
});

test('Resume Match: flags an explicit JD requirement not addressed by the resume', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole('button', { name: /Resume Match/i }));
  await user.type(screen.getByPlaceholderText(/Paste your resume text/i), 'I have led product launches at a consumer app company.');
  await user.type(screen.getByPlaceholderText(/Paste the job description/i), 'Must have prior experience with Kubernetes and Terraform infrastructure automation.');

  // Scoped to a <span> — the JD textarea's own value contains this exact
  // same sentence too, so a plain text match is ambiguous between the two.
  expect(await screen.findByText((_, el) => el.tagName === 'SPAN' && /Must have prior experience with Kubernetes and Terraform/i.test(el.textContent))).toBeInTheDocument();
});

test('Resume Match: auto-saves the draft and reloads it, and saved versions can be loaded back', async () => {
  const user = userEvent.setup();
  const { unmount } = render(<App />);

  await user.click(screen.getByRole('button', { name: /Resume Match/i }));
  await user.type(screen.getByPlaceholderText(/Paste your resume text/i), 'Draft resume text for persistence check.');

  expect(window.localStorage.getItem('pmt_resume_draft')).toContain('Draft resume text for persistence check.');

  // Save it as a named version, then overwrite the draft, then load the saved version back
  await user.type(screen.getByPlaceholderText(/Label \(e\.g\. Startup version\)/i), 'Startup version');
  await user.click(screen.getByRole('button', { name: /Save current/i }));

  unmount();
  render(<App />);
  await user.click(screen.getByRole('button', { name: /Resume Match/i }));

  // The draft persisted across the simulated "reopen the tab" via unmount/remount
  expect(screen.getByDisplayValue(/Draft resume text for persistence check\./i)).toBeInTheDocument();

  await user.clear(screen.getByPlaceholderText(/Paste your resume text/i));
  await user.type(screen.getByPlaceholderText(/Paste your resume text/i), 'Something else entirely.');
  await user.click(screen.getByText(/Startup version/i));

  expect(screen.getByDisplayValue(/Draft resume text for persistence check\./i)).toBeInTheDocument();
});

test('Resume Match: uploading a .txt resume file fills the textarea', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole('button', { name: /Resume Match/i }));

  const file = new File(['Experienced product manager, strong in kubernetes.'], 'resume.txt', { type: 'text/plain' });
  const fileInput = document.querySelector('input[type="file"]');
  await user.upload(fileInput, file);

  expect(await screen.findByDisplayValue(/Experienced product manager, strong in kubernetes\./i)).toBeInTheDocument();
});

test('Templates: saving a profile fills the [X] years / [domain] placeholders', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole('button', { name: /^Templates$/i }));
  await user.type(screen.getByPlaceholderText('Prem Dutta'), 'Test User');
  await user.type(screen.getByPlaceholderText('8'), '9');
  await user.type(screen.getByPlaceholderText(/video\/streaming/i), 'fintech');
  await user.click(screen.getByRole('button', { name: /Save profile/i }));

  // Expand the "Connection Request" template category, which uses [X] years / [domain]
  await user.click(screen.getByText(/Connection Request/i));

  expect(screen.getAllByText(/9 years in fintech/i).length).toBeGreaterThan(0);
});

test('Senior PM toggle: every search string switches to the senior term (incl. SPM), and no tab shows a raw placeholder', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Senior PM' }));

  for (const tab of ['Hacks', 'Alerts', 'Be First', 'Remote', 'Global', 'Govt & PSU', 'Signals', 'Companies']) {
    await user.click(screen.getByRole('button', { name: tab }));
    expect(document.body.textContent).not.toMatch(/\{(ROLE|KW|KWTEXT|KW\+)\}/);
    for (const a of document.querySelectorAll('a[href]')) expect(a.getAttribute('href')).not.toMatch(/\{(ROLE|KW)/);
  }

  await user.click(screen.getByRole('button', { name: 'Hacks' }));
  const senior = '("senior product manager" OR "sr. product manager" OR "senior PM" OR "SPM")';
  expect(screen.getAllByText((_, el) => el?.tagName === 'DIV' && el.textContent.startsWith(`site:jobs.ashbyhq.com ${senior} (Delhi OR Noida`)).length).toBeGreaterThan(0);
  expect(document.body.textContent).not.toMatch(/site:jobs\.lever\.co "product manager"/);

  await user.click(screen.getByRole('button', { name: 'Remote' }));
  expect([...document.querySelectorAll('a[href*="flexjobs"]')].map(a => a.href)[0]).toContain('search=Senior+Product+Manager');
}, 30000); // visits every tab: ~5s locally, slower on CI runners

test('Network: a saved contact on the Companies tab flags matching AI PM roles', async () => {
  global.fetch = jest.fn((url) => Promise.resolve({ ok: true, json: () => Promise.resolve(String(url).includes('ai-roles')
    ? { roles: [{ id: 'gh-rzp-1', title: 'Senior PM, AI', company: 'Razorpay Software Pvt Ltd', location: 'Bengaluru', url: 'https://razorpay.com/jobs/1', level: 'senior', firstSeen: '2026-10-01' }] }
    : { roles: {}, openings: [], signals: [] }) }));
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole('button', { name: 'Companies' }));
  await user.type(screen.getByLabelText('My network'), 'Asha Rao, Razorpay, ex-Aftershoot');
  await user.click(screen.getByRole('button', { name: 'Save network' }));
  expect(JSON.parse(window.localStorage.getItem('pmt_network'))).toEqual([{ name: 'Asha Rao', company: 'Razorpay', note: 'ex-Aftershoot' }]);

  await user.click(screen.getByRole('button', { name: 'AI PM' }));
  expect(await screen.findByText(/You know Asha Rao \(ex-Aftershoot\)/)).toBeInTheDocument();
});

test('Signals tab: renders reposted roles and spikes from the scanner feed', async () => {
  global.fetch = jest.fn((url) => Promise.resolve({ ok: true, json: () => Promise.resolve(String(url).includes('signals')
    ? { signals: [
        { type: 'reopened', company: 'Acme', date: '2026-09-27', title: 'Senior Product Manager', url: 'https://jobs.example.com/2', detail: 'closed 2026-09-10, reposted today' },
        { type: 'eng_spike', company: 'Globex', date: '2026-09-26', detail: '14 engineering openings vs a usual 5' },
      ] }
    : { openings: [] }) }));
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Signals' }));
  expect(await screen.findByText('Acme')).toBeInTheDocument();
  expect(screen.getByText(/14 engineering openings vs a usual 5/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Posting/ })).toHaveAttribute('href', 'https://jobs.example.com/2');
});

test('opens in light theme by default, and remembers a switch to dark', async () => {
  const user = userEvent.setup();
  const { unmount } = render(<App />);
  expect(document.querySelector('[data-theme]')).toHaveAttribute('data-theme', 'light');
  await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
  expect(document.querySelector('[data-theme]')).toHaveAttribute('data-theme', 'dark');
  unmount();
  render(<App />);
  expect(document.querySelector('[data-theme]')).toHaveAttribute('data-theme', 'dark');
});

test('Companies: shows live open PM roles per company, and expands them', async () => {
  global.fetch = jest.fn((url) => Promise.resolve({ ok: true, json: () => Promise.resolve(String(url).includes('company-roles')
    ? { roles: { NVIDIA: [{ id: 'workday-nvidia-1', title: 'Senior Product Manager, AI Platform', location: 'India, Bengaluru', url: 'https://nvidia.wd5.myworkdayjobs.com/x/1', firstSeen: '2026-01-01' }] }, lastRead: { NVIDIA: '2026-09-30' } }
    : { openings: [], signals: [] }) }));
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Companies' }));
  await user.type(screen.getByLabelText('Search companies'), 'NVIDIA');
  expect(await screen.findByText('1 open product role in India')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Show open roles at NVIDIA' }));
  expect(screen.getByRole('link', { name: /Senior Product Manager, AI Platform/ })).toHaveAttribute('href', 'https://nvidia.wd5.myworkdayjobs.com/x/1');
});

test('Announcements: unseen releases pop up once with Go to feature; the megaphone lists every release', async () => {
  window.localStorage.removeItem('pmt_seen_releases');
  jest.spyOn(clock, 'now').mockReturnValue(new Date('2026-10-06T10:00:00'));
  const user = userEvent.setup();
  const { unmount } = render(<App />);

  const dialog = screen.getByRole('dialog', { name: 'New features' });
  expect(within(dialog).getByText('AI PM tab: AI product roles at every level')).toBeInTheDocument();
  await user.click(within(dialog).getByRole('button', { name: 'Go to feature: AI PM tab: AI product roles at every level' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /AI Product Roles/ })).toBeInTheDocument();

  // Acknowledged: no popup next visit, and no unread count on the megaphone.
  unmount();
  render(<App />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: "What's new" }));
  const notes = screen.getByRole('dialog', { name: 'Release notes' });
  expect(within(notes).getByText('Govt & PSU jobs')).toBeInTheDocument();          // older releases stay listed
  await user.click(within(notes).getByRole('button', { name: /Go to feature: YC startups/ }));
  expect(screen.getByText(/YC startups: PM roles open to India/)).toBeInTheDocument();
  clock.now.mockRestore?.();
});

test('Announcements: nothing pops up once releases are older than 14 days', () => {
  window.localStorage.removeItem('pmt_seen_releases');
  jest.spyOn(clock, 'now').mockReturnValue(new Date('2027-01-15T10:00:00'));
  render(<App />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: "What's new" })).toBeInTheDocument();
  jest.restoreAllMocks();
});

test('AI PM tab: level and YC filters, and remote badge', async () => {
  global.fetch = jest.fn((url) => Promise.resolve({ ok: true, json: () => Promise.resolve(String(url).includes('ai-roles') ? { roles: [
    { id: 'ashby-sarvam-1', title: 'Product Manager - Chanakya', company: 'Sarvam AI', location: 'Delhi', url: 'https://jobs.ashbyhq.com/sarvam/1', level: 'pm', firstSeen: '2026-10-01' },
    { id: 'workday-x-2', title: 'Senior Product Manager, GenAI', company: 'Adobe', location: 'Noida, India', url: 'https://adobe.wd5.myworkdayjobs.com/x/2', level: 'senior', firstSeen: '2026-10-01' },
    { id: 'yc-3', title: 'Lead/Group Product Manager', company: 'Noora Health', location: 'Remote', url: 'https://www.ycombinator.com/companies/noora/jobs/3', level: 'group', eligibility: 'remote', firstSeen: '2026-10-01' },
  ] } : { openings: [], roles: [], signals: [] }) }));
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'AI PM' }));
  expect(await screen.findByText('3 of 3')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /^Senior PM · 1$/ }));
  expect(screen.getByText('1 of 3')).toBeInTheDocument();
  expect(screen.getByText('Senior Product Manager, GenAI')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /^Group \/ Principal \/ Lead · 1$/ }));
  expect(screen.getByText('2 of 3')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'All levels' }));
  await user.click(screen.getByRole('button', { name: /YC startups only/ }));
  expect(screen.getByText('1 of 3')).toBeInTheDocument();
  expect(screen.getByText('REMOTE')).toBeInTheDocument();

});

test('Group PM toggle: searches switch to the group / principal / lead PM term', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Group PM' }));
  await user.click(screen.getByRole('button', { name: 'Hacks' }));
  expect(document.body.textContent).toContain('("group product manager" OR "GPM" OR "principal product manager" OR "lead product manager")');
});

test('Companies: role filters (level, city, new) narrow counts; Refresh re-fetches the latest scan', async () => {
  const roles = { NVIDIA: [
    { id: 'a', title: 'Senior Product Manager, AI', location: 'India, Bengaluru', url: 'https://x/a', level: 'senior', firstSeen: '2026-01-01' },
    { id: 'b', title: 'Product Manager', location: 'Pune, India', url: 'https://x/b', level: 'pm', firstSeen: '2026-01-01' },
  ] };
  global.fetch = jest.fn((url) => Promise.resolve({ ok: true, json: () => Promise.resolve(String(url).includes('company-roles')
    ? { scannedAt: new Date(Date.now() - 2 * 3600e3).toISOString(), roles, lastRead: { NVIDIA: '2026-10-05' } }
    : { openings: [], roles: [], signals: [] }) }));
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Companies' }));
  expect(await screen.findByText(/last scan 2h ago/)).toBeInTheDocument();
  expect(screen.getByText(/^2 open product roles in India right now/)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Senior PM' , pressed: false }));
  expect(screen.getByText(/^1 open product roles in India matching your filters/)).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Filter roles by city'), 'Pune');
  expect(screen.getByText(/^0 open product roles in India matching your filters/)).toBeInTheDocument();

  const calls = global.fetch.mock.calls.length;
  await user.click(screen.getByRole('button', { name: 'Refresh roles' }));
  expect(global.fetch.mock.calls.slice(calls).some(([u]) => /company-roles\.json\?t=\d+/.test(String(u)))).toBe(true);
});

test('All Jobs: LinkedIn "new since your last check" uses the last check time, and clicking updates it', async () => {
  const last = Date.parse('2026-10-04T18:06:30Z');
  window.localStorage.setItem('pmt_platform_meta', JSON.stringify({ linkedin: { lastChecked: last } }));
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'All Jobs' }));
  const since = screen.getByRole('link', { name: /New since your last check/ });
  expect(since.getAttribute('href')).toContain('f_TPR=a1791137190-');
  expect(since.getAttribute('href')).toContain('/jobs/search-results/');
  fireEvent.click(since);
  expect(JSON.parse(window.localStorage.getItem('pmt_platform_meta')).linkedin.lastChecked).toBeGreaterThan(last);
});

test('Hack cards: copy the search string, or the full Google link with the time filter', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Hacks' }));
  const writeText = jest.spyOn(navigator.clipboard, 'writeText');
  await user.click(screen.getByRole('button', { name: 'Copy search string: Singapore PM Roles' }));
  expect(writeText).toHaveBeenLastCalledWith('"product manager" Singapore (hiring OR jobs) -intern');
  await user.click(screen.getAllByRole('button', { name: /Copy link \(Past week\)/ })[0]);
  expect(writeText.mock.calls.at(-1)[0]).toMatch(/^https:\/\/www\.google\.com\/search\?q=.+&tbs=qdr:/);
});
