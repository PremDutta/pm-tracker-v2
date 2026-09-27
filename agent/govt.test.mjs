// Run with: node --test agent/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isGovtPmTitle, eligibilityFlags, isoDay, embeddedRecords, jobsFromRecords } from './govt.mjs';

test('govt title filter keeps product roles under govt naming, drops design and fresher schemes', () => {
  for (const t of ['Lead Product Management', 'Senior Associate NACH Product', 'Associate Director - Product', 'Technical Product Manager']) {
    assert.ok(isGovtPmTitle(t), t);
  }
  for (const t of ['Senior Associate Product Design (NIPL)', 'Product Marketing Lead', 'Management Trainee - Product', 'Manager - IT Infrastructure']) {
    assert.ok(!isGovtPmTitle(t), t);
  }
});

test('eligibility flags match the india-govt-search rules', () => {
  assert.deepEqual(eligibilityFlags('Consultant on deputation basis'), ['deputation_or_govt_employees_only']);
  assert.deepEqual(eligibilityFlags('Upper age limit 45. MBA preferred. On contract basis.'), ['age_limit_mentioned', 'mba_mentioned', 'contract']);
});

test('isoDay reads the date formats govt sites use', () => {
  assert.equal(isoDay('2026-09-26T00:00:00Z'), '2026-09-26');
  assert.equal(isoDay('26.09.2026'), '2026-09-26');
  assert.equal(isoDay('Last date: 12 August 2026'), '2026-08-12');
  assert.equal(isoDay(''), null);
});

const source = { name: 'Reserve Bank Innovation Hub', short: 'RBIH', category: 'govt_backed_other', careersUrl: 'https://rbihub.in/careers', location: 'Bengaluru' };

test('embedded JSON: reads data-* attribute records, applies where/require/url_template', () => {
  const job = (name, slug, status) => JSON.stringify({ name, slug, status, sidebar: { location: 'Mumbai' } }).replace(/"/g, '&quot;');
  const html = `<div data-job="${job('Senior Product Manager', 'spm', 'published')}"></div>
    <div data-job="${job('Old Product Role', 'old', 'draft')}"></div>
    <div data-nav="{&quot;name&quot;:&quot;Careers&quot;}"></div>`;
  const config = { require: ['name', 'slug', 'sidebar'], where: { status: 'published' }, url_template: 'https://rbihub.in/career/{slug}/', fields: { id: 'slug', title: 'name', location: 'sidebar.location' } };
  const jobs = jobsFromRecords(embeddedRecords(html, config), { ...source, config });
  assert.equal(jobs.length, 1);
  assert.deepEqual([jobs[0].title, jobs[0].url, jobs[0].location, jobs[0].id], ['Senior Product Manager', 'https://rbihub.in/career/spm/', 'Mumbai', 'govt-rbih-spm']);
});

test('embedded JSON: reads a Next.js flight payload', () => {
  const payload = JSON.stringify('x:["$","div",null,{"job":{"id":7,"job_title":"Technical Product Manager","last_date":"2026-09-26","dep":"NeGD"}}]');
  const html = `<script>self.__next_f.push([1,${payload}])</script>`;
  const config = { anchor: 'id', require: ['id', 'job_title'], fields: { id: 'id', title: 'job_title', deadline: 'last_date', company: 'dep' } };
  const [job] = jobsFromRecords(embeddedRecords(html, config), { ...source, short: 'DIC ORA', careersUrl: 'https://ora.digitalindiacorporation.in/', config });
  assert.equal(job.title, 'Technical Product Manager');
  assert.equal(job.company, 'NeGD');
  assert.equal(job.deadline, '2026-09-26');
  assert.equal(job.url, 'https://ora.digitalindiacorporation.in/?job=7');
});

test('API records: subsidiary prefix sets the company', () => {
  const config = { fields: { id: 'id', title: 'Posting_Title', url: '$url', department: 'Client_Name.name' }, company_by_department_prefix: { NBBL: 'NPCI Bharat BillPay Ltd' } };
  const [job] = jobsFromRecords([{ id: '1', Posting_Title: 'Lead Product Management', $url: 'https://careers.npci.org.in/jobs/1', Client_Name: { name: 'NBBL Product Development' } }], { ...source, name: 'NPCI', short: 'NPCI', config });
  assert.equal(job.company, 'NPCI Bharat BillPay Ltd');
});

// ─── Careers-page notices ───────────────────────────────────────────────────
import { extractNotices, isAlertableNotice } from './govt-notices.mjs';
import { chunkText } from './notify.mjs';

const TODAY = '2026-09-25';
const PSU = { name: 'Some PSU Ltd', short: 'SPL', category: 'navratna', location: 'Delhi' };
const page = `
<header><nav><a href="/digital">Digital Banking Services and Products</a></nav></header>
<script>var x = '<a href="/x">Product Manager script leak</a>';</script>
<table>
  <tr><td><a href="/rect/pm.pdf">Engagement of Senior Product Manager on contract basis</a></td><td>Last date: 10.10.2026</td></tr>
  <tr><td>Programme Manager - Digital Transformation</td><td><a href="/rect/prog.pdf">Click here</a></td><td>01.10.2026</td></tr>
  <tr><td><a href="/rect/old.pdf">Recruitment of Product Manager</a></td><td>12.01.2025</td></tr>
  <tr><td><a href="/rect/closed.pdf">Product Lead (Status : Closed)</a></td></tr>
  <tr><td><a href="/uploads/2023/pm-notice.pdf">Product Manager (On Contract)</a></td></tr>
  <tr><td><a href="/rect/sl.pdf">Shortlisted candidates for Product Manager interview</a></td></tr>
  <tr><td><a href="/rect/it.pdf">Recruitment of IT Officer (Scale I)</a></td><td>30.10.2026</td></tr>
  <tr><td><a href="/rect/trainee.pdf">Recruitment of Management Trainee (Product)</a></td></tr>
</table>`;

test('careers page: keeps live product / PM-adjacent notices, drops chrome, closed, stale, outcomes, trainees', () => {
  const notices = extractNotices(page, 'https://spl.co.in/careers', PSU, TODAY).filter(n => isAlertableNotice(n, 'medium'));
  assert.deepEqual(notices.map(n => n.title).sort(), [
    'Engagement of Senior Product Manager on contract basis',
    'Programme Manager - Digital Transformation',
  ].sort());
  const pm = notices.find(n => n.title.startsWith('Engagement'));
  assert.equal(pm.deadline, '2026-10-10');
  assert.equal(pm.url, 'https://spl.co.in/rect/pm.pdf');
  assert.ok(pm.flags.includes('contract'));
  assert.match(pm.id, /^govt-notice-[0-9a-f]{16}$/);
});

test('careers page: PM-adjacent digital roles need a high/medium PM-relevance org', () => {
  const notices = extractNotices(page, 'https://spl.co.in/careers', PSU, TODAY);
  const prog = notices.find(n => n.title.startsWith('Programme Manager'));
  assert.ok(isAlertableNotice(prog, 'medium'));
  assert.ok(!isAlertableNotice(prog, 'low'));
});

test('WhatsApp chunking splits on lines and keeps every line', () => {
  const text = Array.from({ length: 60 }, (_, i) => `• Job ${i} — https://example.gov.in/careers/${i}`).join('\n');
  const chunks = chunkText(text, 500);
  assert.ok(chunks.length > 1 && chunks.every(c => c.length <= 500));
  assert.equal(chunks.join('\n'), text);
});

// ─── Hiring signals from company boards ─────────────────────────────────────
import { computeSignals, normTitle } from './signals.mjs';

const isPm = (t) => /product manager/i.test(t);
const board = (company, jobs) => ({ company, jobs: jobs.map(([id, title]) => ({ id, title, url: `https://jobs.example.com/${id}` })) });
const run = (history, boards, day) => computeSignals(history, boards, isPm, day);

test('reopened: a PM title that disappeared comes back under a new id', () => {
  let h = { companies: {} };
  ({ history: h } = run(h, [board('Acme', [['1', 'Senior Product Manager (Bengaluru)']])], '2026-09-01'));
  ({ history: h } = run(h, [board('Acme', [])], '2026-09-05'));                       // closed
  const { newSignals } = run(h, [board('Acme', [['2', 'Senior Product Manager (Remote)']])], '2026-09-20');
  assert.equal(newSignals.length, 1);
  assert.equal(newSignals[0].type, 'reopened');
  assert.equal(newSignals[0].id, '2');
});

test('reopened: not raised for a role still open, a first sighting, or distinct titles', () => {
  let h = { companies: {} };
  ({ history: h } = run(h, [board('Acme', [['1', 'Product Manager - Payments']])], '2026-09-01'));
  let r = run(h, [board('Acme', [['1', 'Product Manager - Payments'], ['3', 'Product Manager - Growth']])], '2026-09-02');
  assert.deepEqual(r.newSignals, []);
  assert.notEqual(normTitle('Product Manager - Payments'), normTitle('Product Manager - Growth'));
});

test('eng spike: needs 5+ days of history, fires once per day', () => {
  let h = { companies: {} };
  const eng = (n) => Array.from({ length: n }, (_, i) => [`e${n}-${i}`, `Software Engineer ${i}`]);
  for (const d of ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04']) ({ history: h } = run(h, [board('Acme', eng(4))], d));
  assert.deepEqual(run(h, [board('Acme', eng(20))], '2026-09-05').newSignals, []);   // only 4 earlier days
  ({ history: h } = run(h, [board('Acme', eng(4))], '2026-09-05'));
  const first = run(h, [board('Acme', eng(12))], '2026-09-06');
  assert.equal(first.newSignals[0]?.type, 'eng_spike');
  assert.deepEqual(run(first.history, [board('Acme', eng(12))], '2026-09-06').newSignals, []); // same day rerun
});

// ─── Funding headlines + ONDC-style mailto listings ────────────────────────
import { companyFromHeadline } from './funding.mjs';
import { mailtoRoles } from './govt.mjs';

test('funding: company names from real headlines; non-raises skipped', () => {
  const cases = {
    'Enterprise AI startup Ema raises $77 Mn in Series B led by Creaegis': 'Ema',
    'Sauce leads seed round in preventive pain care brand betterhood': 'betterhood',
    'Fintech and brokerage startup Definedge raises Rs 22 Cr in pre-Series A': 'Definedge',
    'Exclusive: Drivn’s Indian entity raises Rs 45 Cr from Avaana Capital': 'Drivn',
    'Exclusive: Disha (formerly Curelink) raises Series A led by General Catalyst': 'Disha',
    'PhonePe enters UAE, secures IPA from Central Bank': null,
    'Akamai lands $11.6B cloud computing deal with Anthropic': null,
    'Aequs To Raise Rs 500 Cr Via Preferential Issue': null,
  };
  for (const [headline, want] of Object.entries(cases)) assert.equal(companyFromHeadline(headline), want, headline);
});

test('mailto listings: role titles from application subjects', () => {
  const html = `<a href="mailto:careers@ondc.org?subject=Application%20-%20SVP%20Product%20(Product%20Head)">Apply</a>
    <a href="mailto:careers@ondc.org?subject=Application%20-%20Open%20Application">Write to us</a>
    <a href="mailto:careers@ondc.org?subject=Application%20-%20Product%20Lead%20%2F%20Principal%20Product%20Manager">Apply</a>`;
  const roles = mailtoRoles(html, { name: 'ONDC', short: 'ONDC', careersUrl: 'https://ondc.org/pages/careers.html', category: 'section8_govt' });
  assert.deepEqual(roles.map(r => r.title), ['SVP Product (Product Head)', 'Product Lead / Principal Product Manager']);
});
