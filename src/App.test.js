import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

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
});

test('renders the home page without crashing', () => {
  render(<App />);
  expect(screen.getByText('PM Jobs Tracker')).toBeInTheDocument();
  expect(screen.getByText(/Find every PM job/i)).toBeInTheDocument();
});

test('Tracker: add an application, see it under Applied, move it to Interview', async () => {
  const user = userEvent.setup();
  render(<App />);

  // Exact match — a substring match would also hit the Home page's "Application Tracker" feature card
  await user.click(screen.getByRole('button', { name: 'Tracker' }));
  await user.type(screen.getByPlaceholderText('Company *'), 'Zeta Test Co');
  await user.type(screen.getByPlaceholderText('Role'), 'Senior PM');
  await user.click(screen.getByRole('button', { name: /Add$/i }));

  expect(screen.getByText('Zeta Test Co')).toBeInTheDocument();

  const stored = JSON.parse(window.localStorage.getItem('pmt_applications'));
  expect(stored).toHaveLength(1);
  expect(stored[0].company).toBe('Zeta Test Co');
  expect(stored[0].status).toBe('Applied');

  // Move it to Interview via the per-card status select — it's the only
  // <select> rendered on the Tracker tab, so no need to scope the query.
  await user.selectOptions(screen.getByRole('combobox'), 'Interview');

  const updated = JSON.parse(window.localStorage.getItem('pmt_applications'));
  expect(updated[0].status).toBe('Interview');
});

test('Tracker: an application applied 10 days ago with no update shows a follow-up nudge', async () => {
  const user = userEvent.setup();
  const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
  window.localStorage.setItem('pmt_applications', JSON.stringify([
    { id: 'old1', company: 'Stale Corp', role: 'PM', platform: '', status: 'Applied', appliedDate: tenDaysAgo },
  ]));

  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Tracker' }));

  expect(screen.getByText('Stale Corp')).toBeInTheDocument();
  expect(screen.getByText(/Follow up — applied 10d ago/i)).toBeInTheDocument();
  // Custom matcher, not a plain string/regex — the banner's count is inside a
  // <strong> tag, so its text is split across sibling nodes and the default
  // text matcher won't find it; checking textContent directly sidesteps that.
  expect(screen.getByText((_, el) => el.tagName === 'SPAN' && el.textContent.includes('applied 7+ days ago with no update'))).toBeInTheDocument();
});

test('Watchlist: add a target company and see a generated outreach draft', async () => {
  const user = userEvent.setup();
  render(<App />);

  // Exact match — a substring match would also hit the Home page's "Target Company Watchlist" feature card
  await user.click(screen.getByRole('button', { name: 'Watchlist' }));
  await user.type(screen.getByPlaceholderText('Company *'), 'Acme Robotics');
  await user.click(screen.getByRole('button', { name: /Add company/i }));

  expect(screen.getByText('Acme Robotics')).toBeInTheDocument();
  // The generated draft references the company name
  expect(screen.getByText(/Acme Robotics is hiring/i)).toBeInTheDocument();

  const stored = JSON.parse(window.localStorage.getItem('pmt_watchlist'));
  expect(stored).toHaveLength(1);
  expect(stored[0].company).toBe('Acme Robotics');
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
