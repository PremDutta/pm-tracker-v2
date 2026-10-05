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

// ─── Digest + urgent alerts ─────────────────────────────────────────────────
import { istToday, daysLeft, enqueue, urgentItems, urgentText, digestText, markReminders } from './digest.mjs';

test('istToday uses India time: 20:00 UTC is already the next day in IST', () => {
  assert.equal(istToday(new Date('2026-09-30T20:00:00Z')), '2026-10-01');
  assert.equal(istToday(new Date('2026-09-30T18:00:00Z')), '2026-09-30');
  assert.equal(daysLeft('2026-10-03', '2026-09-30'), 3);
});

const opening = (id, deadline) => ({ id, title: `Role ${id}`, company: 'NeGD', url: `https://x.gov.in/${id}`, deadline, flags: [] });

test('urgent: new govt roles closing within 3 days, and each reminder stage fires once', () => {
  const today = '2026-09-30';
  const openings = [opening('govt-a', '2026-10-03'), opening('govt-b', '2026-10-01'), opening('govt-c', '2026-10-20'), opening('govt-d', '2026-09-29')];
  const newJobs = [opening('govt-new', '2026-10-02'), { ...opening('pm-1', null), id: 'ashby-x-1' }];
  let u = urgentItems({ newJobs, openings, signals: [], reminders: {}, today });
  assert.deepEqual(u.newClosing.map(j => j.id), ['govt-new']);
  assert.deepEqual(u.reminders.map(o => [o.id, o.stage]), [['govt-a', '3d'], ['govt-b', '1d']]);   // not c (20 days), not d (closed)
  assert.match(urgentText(u, today), /closing within 3 days[\s\S]*deadline reminder/);

  const reminders = markReminders({}, u.reminders, openings, today);
  u = urgentItems({ newJobs: [], openings, signals: [], reminders, today });
  assert.deepEqual(u.reminders, []);                                             // same day: nothing repeats
  u = urgentItems({ newJobs: [], openings, signals: [], reminders, today: '2026-10-02' });
  assert.deepEqual(u.reminders.map(o => [o.id, o.stage]), [['govt-a', '1d']]);  // a moves to its 1-day stage
  assert.equal(urgentText({ newClosing: [], reminders: [], reposted: [] }, today), '');
});

test('digest: queue dedupes, sections by type, empty when there is nothing', () => {
  const today = '2026-09-30';
  let q = { jobs: [], signals: [], reminders: {} };
  const pm = { id: 'ashby-x-1', title: 'Senior Product Manager', company: 'Acme', url: 'https://jobs.ashbyhq.com/acme/1', source: 'Ashby' };
  q = enqueue(q, [pm, opening('govt-a', '2026-10-05')], [{ type: 'funding', company: 'Acme', title: 'Acme raises $5M', watched: true, date: today }], today);
  q = enqueue(q, [pm], [{ type: 'funding', company: 'Acme', title: 'Acme raises $5M', watched: true, date: today }], today);
  assert.equal(q.jobs.length, 2);
  assert.equal(q.signals.length, 1);
  const text = digestText(q, [opening('govt-a', '2026-10-05')], today);
  assert.match(text, /PM jobs digest, 30\/09\/2026/);
  assert.match(text, /New govt & PSU roles \(1\)[\s\S]*New PM roles \(1\)[\s\S]*Acme just raised/);
  assert.match(digestText({ ...q, jobs: [pm] }, [opening('govt-a', '2026-10-05')], today), /closing this week \(1\)/);
  assert.equal(digestText({ jobs: [], signals: [], reminders: {} }, [], today), '');
  // A role that is both new and closing this week is listed once, under new roles.
  const both = digestText(q, [opening('govt-a', '2026-10-05')], today);
  assert.equal((both.match(/Role govt-a/g) || []).length, 1);
});

// ─── YC + AI role snapshots ─────────────────────────────────────────────────
import { indiaEligibility, jobsFromYcPage } from './yc.mjs';
import { roleLevel, isAiTitle } from './snapshots.mjs';

test('YC / remote eligibility: India-based or remote-open-to-India only', () => {
  const cases = {
    'Bengaluru, KA, IN / Bengaluru, Karnataka, IN': 'india', 'IN / Remote (IN)': 'india', 'ID / MY / IN / Remote (ID; MY; IN)': 'india',
    'Remote': 'remote', 'Remote (Anywhere)': 'remote', 'Remote (US)': null, 'USA - Remote': null, 'US remote': null,
    'San Francisco, CA or Remote, US': null, 'Remote-Friendly (Travel-Required) |  Washington, DC': null,
    'Remote in Europe': null, 'Berlin, BE, DE / Remote': null, 'New York, NY, US': null,
  };
  for (const [loc, want] of Object.entries(cases)) assert.equal(indiaEligibility(loc), want, loc);
});

test('YC pages: job list parsed from the data-page attribute', () => {
  const props = { props: { jobPostings: [{ id: 7, title: 'Senior Product Manager', url: '/companies/x/jobs/7', location: 'Bengaluru, KA, IN', role: 'product', companyName: 'X & Co' }] } };
  const html = `<div id="root" data-page="${JSON.stringify(props).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></div>`;
  const [job] = jobsFromYcPage(html);
  assert.equal(job.companyName, 'X & Co');
  assert.equal(jobsFromYcPage('<html>no data</html>').length, 0);
});

test('role level and AI title detection', () => {
  assert.equal(roleLevel('Staff/Director – AI HW Product Management'), 'leadership');
  assert.equal(roleLevel('Lead/Group Product Manager'), 'group');
  assert.equal(roleLevel('Sr. Product Manager - Tech, Profit Intelligence'), 'senior');
  assert.equal(roleLevel('Product Manager - Conversational AI'), 'pm');
  for (const t of ['AI Product Manager I', 'Product Manager - AI Agents', 'Senior Product Manager, GenAI', 'Product Manager (Models)', 'Product Manager 3- Data Platform']) assert.ok(isAiTitle(t), t);
  for (const t of ['Product Manager - Payments', 'Senior Product Manager, Growth', 'Product Owner - Lending']) assert.ok(!isAiTitle(t), t);
});
