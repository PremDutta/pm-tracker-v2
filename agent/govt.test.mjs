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
