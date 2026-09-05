import React from 'react';
import { render, screen } from '@testing-library/react';
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

test('Resume Match: flags a keyword present in the JD but missing from the resume', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole('button', { name: /Resume Match/i }));
  await user.type(screen.getByPlaceholderText(/Paste your resume text/i), 'Experienced product manager who ships features and leads teams.');
  await user.type(screen.getByPlaceholderText(/Paste the job description/i), 'Looking for a product manager with strong kubernetes and blockchain experience.');

  // Exact match — a substring match would also hit the JD textarea's own text content
  expect(await screen.findByText(/^kubernetes$/i)).toBeInTheDocument();
  expect(screen.getByText(/^blockchain$/i)).toBeInTheDocument();
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
