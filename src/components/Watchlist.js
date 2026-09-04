import React, { useState } from 'react';
import { Plus, Trash2, Building2, Search, ExternalLink, Copy, Check } from 'lucide-react';
import { getWatchlist, addWatchlistCompany, removeWatchlistCompany } from '../storage';

// Draft generator for scaled, personalized outreach — this app has no backend
// and can't send email, so this produces a per-company draft you copy into
// your own mail client rather than an actual mail-merge send.
const buildDraft = (company, role, profile) => {
  const years = profile.years ? `${profile.years} years` : '[X] years';
  const domain = profile.domain || '[domain]';
  const achievement = profile.achievements?.find(Boolean) || '[a quantified achievement]';
  const name = profile.name || '[Your Name]';
  return `Hi [Name],\n\nI noticed ${company} is hiring for ${role || '[Role]'} — it's the kind of problem I want to work on next. I'm a PM with ${years} in ${domain}, most recently: ${achievement}.\n\nWould you be open to a quick chat, or a referral if there's a fit?\n\nThanks,\n${name}`;
};

export default function Watchlist({ t, card, btnPrimary, btnSecondary, profile }) {
  const [list, setList] = useState(getWatchlist());
  const [form, setForm] = useState({ company: '', domain: '', careersUrl: '', role: '' });
  const [copiedId, setCopiedId] = useState(null);
  const inputStyle = { padding: '10px 12px', borderRadius: '10px', border: `1px solid ${t.border}`, background: t.inlineBg, color: t.text, fontSize: '13px' };

  const submit = (e) => {
    e.preventDefault();
    if (!form.company.trim()) return;
    setList(addWatchlistCompany(form));
    setForm({ company: '', domain: '', careersUrl: '', role: '' });
  };

  const remove = (id) => setList(removeWatchlistCompany(id));

  const copy = (text, id) => {
    navigator.clipboard.writeText(text).catch(() => {}).finally(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); });
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '34px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '10px' }}>Target Company Watchlist</h2>
        <p style={{ fontSize: '16px', color: t.textSecondary, maxWidth: '560px', margin: '0 auto' }}>Targeted beats mass. Track the specific companies you actually want, with one-click paths to their careers page, hidden postings, and the people who'd hire you.</p>
      </div>

      <form onSubmit={submit} style={{ ...card, marginBottom: '28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '10px', alignItems: 'end' }}>
        <div><input style={inputStyle} placeholder="Company *" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} required /></div>
        <div><input style={inputStyle} placeholder="Domain (acme.com)" value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} /></div>
        <div><input style={inputStyle} placeholder="Careers page URL" value={form.careersUrl} onChange={e => setForm({ ...form, careersUrl: e.target.value })} /></div>
        <div><input style={inputStyle} placeholder="Target role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} /></div>
        <button type="submit" style={{ ...btnPrimary, padding: '10px 16px', fontSize: '13px', justifySelf: 'start' }}><Plus size={14} /> Add company</button>
      </form>

      {list.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px', color: t.textSecondary }}>
          <Building2 size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p>No target companies yet. Add the ones you're actually going after — this replaces "check 26 platforms" with "check the 15 companies I actually want."</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '14px' }}>
          {list.map(w => {
            const careerDork = `site:${w.domain || (w.company.toLowerCase().replace(/\s+/g, '') + '.com')}/careers "product manager"`;
            const recruiterSearch = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(w.company + ' recruiter OR "talent acquisition" OR "people team"')}`;
            const draft = buildDraft(w.company, w.role, profile);
            return (
              <div key={w.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 3px', fontSize: '17px', fontWeight: '600' }}>{w.company}</h3>
                    {w.role && <p style={{ margin: 0, fontSize: '12px', color: t.textSecondary }}>Target: {w.role}</p>}
                  </div>
                  <button onClick={() => remove(w.id)} style={{ background: 'none', border: 'none', color: t.textTertiary, cursor: 'pointer' }}><Trash2 size={15} /></button>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {w.careersUrl && <a href={w.careersUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, padding: '8px 14px', fontSize: '12px' }}>Careers page <ExternalLink size={11} /></a>}
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(careerDork)}`} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, padding: '8px 14px', fontSize: '12px' }}><Search size={12} /> Hidden postings</a>
                  <a href={recruiterSearch} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, padding: '8px 14px', fontSize: '12px' }}>Find recruiters on LinkedIn <ExternalLink size={11} /></a>
                  {w.domain && <a href="https://hunter.io/" target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, padding: '8px 14px', fontSize: '12px' }} title={`Paste domain: ${w.domain}`}>Hunter.io (paste: {w.domain})</a>}
                </div>
                <div style={{ background: t.codeBg, padding: '14px 16px', borderRadius: '12px', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap', color: t.text, marginBottom: '10px' }}>{draft}</div>
                <button onClick={() => copy(draft, w.id)} style={{ ...btnSecondary, padding: '7px 14px', fontSize: '12px' }}>
                  {copiedId === w.id ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy draft</>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
