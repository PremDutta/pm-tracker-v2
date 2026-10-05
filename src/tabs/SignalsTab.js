import React, { useState, useEffect } from 'react';
import { ExternalLink, Search, Users } from 'lucide-react';
import { getNetwork } from '../storage';
import { ContactFlag } from '../components/Network';
import NewBadge from '../components/NewBadge';

// Written by the background scanner (agent/signals.json), read straight from
// GitHub so it's fresh without redeploying. REACT_APP_SIGNALS_URL overrides it
// for local previews.
export const SIGNALS_URL = process.env.REACT_APP_SIGNALS_URL || 'https://raw.githubusercontent.com/PremDutta/pm-tracker-v2/main/agent/signals.json';

const TYPES = {
  reopened:  { icon:'🔁', label:'Reposted PM role', why:'The first hire fell through or the role was re-scoped. They are motivated and moving fast: apply today and message the hiring manager.' },
  funding:   { icon:'💸', label:'Just raised',      why:'Fresh funding usually means PM hiring within 1-3 months. Reach the founder or product head before a JD exists.' },
  eng_spike: { icon:'📈', label:'Engineering hiring spike', why:'New product lines get engineers first and PMs next. Get on the product leader\'s radar now.' },
};

// VC portfolio boards: every open role across a fund's portfolio. The scanner
// already reads these for PM roles in India; the links are for browsing.
const VC_BOARD_LINKS = [
  { name: 'Peak XV portfolio', url: 'https://careers.peakxv.com/jobs' },
  { name: 'Lightspeed portfolio', url: 'https://jobs.lsvp.com/jobs' },
  { name: 'Accel portfolio', url: 'https://jobs.accel.com/' },
];

const peopleSearch = (company) => `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${company} ("head of product" OR "VP product" OR "director of product" OR founder)`)}`;
const roleSearch = (company, role) => `https://www.google.com/search?q=${encodeURIComponent(`"${company}" ${role.searchTerm} (careers OR jobs OR hiring)`)}`;

export default function SignalsTab({ t, card, btnSecondary, badge, role, setActiveTab }) {
  const [state, setState] = useState({ status: 'loading', signals: [] });
  const [type, setType] = useState('all');
  const [network] = useState(() => getNetwork());

  useEffect(() => {
    let cancelled = false;
    fetch(SIGNALS_URL)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { if (!cancelled) setState({ status: 'ready', signals: d.signals || [] }); })
      .catch(() => { if (!cancelled) setState({ status: 'error', signals: [] }); });
    return () => { cancelled = true; };
  }, []);

  const counts = state.signals.reduce((acc, s) => ({ ...acc, [s.type]: (acc[s.type] || 0) + 1 }), {});
  const visible = state.signals.filter(s => TYPES[s.type] && (type === 'all' || s.type === type));
  const chip = (active) => ({ padding:'7px 14px', borderRadius:'980px', border:`1px solid ${active ? t.accent : t.border}`, background:active ? t.accent : t.cardBg, color:active ? '#fff' : t.textSecondary, fontSize:'12px', fontWeight:'500', cursor:'pointer', whiteSpace:'nowrap' });

  return (
    <div>
      <div style={{ textAlign:'center', marginBottom:'28px' }}>
        <h2 style={{ fontSize:'34px', fontWeight:'700', letterSpacing:'-0.02em', marginBottom:'10px', display:'inline-flex', alignItems:'center', gap:'10px' }}>
          Hiring Signals <NewBadge id="tab:signals" t={t} style={{ fontSize:'11px', padding:'3px 10px' }} />
        </h2>
        <p style={{ fontSize:'16px', color:t.textSecondary, maxWidth:'600px', margin:'0 auto' }}>PM roles before they're posted. The scanner watches your target companies' job boards and funding news every 6 hours.</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:'10px', marginBottom:'20px' }}>
        {Object.entries(TYPES).map(([id, ty]) => (
          <div key={id} style={{ ...card, padding:'14px 16px' }}>
            <div style={{ fontSize:'14px', fontWeight:'600', marginBottom:'4px' }}>{ty.icon} {ty.label}</div>
            <div style={{ fontSize:'12px', color:t.textSecondary, lineHeight:1.5 }}>{ty.why}</div>
          </div>
        ))}
      </div>

      <div id="signals-vc" style={{ ...card, padding:'14px 16px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', scrollMarginTop:'140px' }}>
        <span style={{ fontSize:'14px', fontWeight:'600' }}>💼 VC portfolio job boards</span>
        <NewBadge id="signals:vc-boards" t={t} />
        <span style={{ fontSize:'12px', color:t.textSecondary, flex:'1 1 260px' }}>PM roles in India from these boards now arrive in your alerts automatically.</span>
        {VC_BOARD_LINKS.map(b => <a key={b.name} href={b.url} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, padding:'6px 12px', fontSize:'12px' }}>{b.name} <ExternalLink size={11}/></a>)}
      </div>

      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'14px' }}>
        <button onClick={()=>setType('all')} style={chip(type==='all')}>All · {state.signals.filter(s => TYPES[s.type]).length}</button>
        {Object.entries(TYPES).map(([id, ty]) => <button key={id} onClick={()=>setType(id)} style={chip(type===id)}>{ty.icon} {ty.label} · {counts[id] || 0}</button>)}
      </div>

      {state.status === 'loading' && <div style={{ ...card, color:t.textSecondary, fontSize:'13px' }}>Loading signals…</div>}
      {state.status === 'error' && <div style={{ ...card, color:t.textSecondary, fontSize:'13px' }}>Couldn't load signals right now. The Hiring Signals searches in the Hacks tab still work.</div>}
      {state.status === 'ready' && visible.length === 0 && (
        <div style={{ ...card, color:t.textSecondary, fontSize:'13px', lineHeight:1.6 }}>
          No signals in the last 30 days yet. Engineering spikes need about a week of history per company to detect; reposted roles and funding news appear as they happen. Meanwhile, try the <button onClick={()=>setActiveTab('hacks')} style={{ background:'none', border:'none', color:t.accent, cursor:'pointer', padding:0, fontSize:'13px' }}>Hiring Signals searches</button>.
        </div>
      )}
      {visible.length > 0 && (
        <div style={{ display:'grid', gap:'8px' }}>
          {visible.map((s, i) => {
            const ty = TYPES[s.type];
            return (
              <div key={`${s.type}-${s.company}-${s.date}-${i}`} style={{ ...card, padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
                <span style={{ fontSize:'22px' }}>{ty.icon}</span>
                <div style={{ flex:'1 1 260px', minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'15px', fontWeight:'600' }}>{s.company}</span>
                    <span style={{ ...badge(t.badgeText, t.badgeBg), fontSize:'9px' }}>{ty.label.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize:'12px', color:t.textSecondary, marginTop:'2px' }}>{[s.title, s.detail, s.date].filter(Boolean).join(' · ')}</div>
                  <ContactFlag company={s.company} t={t} network={network} />
                </div>
                {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, padding:'6px 12px', fontSize:'12px' }}>{s.type === 'funding' ? 'News' : 'Posting'} <ExternalLink size={11}/></a>}
                <a href={roleSearch(s.company, role)} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, padding:'6px 12px', fontSize:'12px' }}><Search size={11}/> Their PM roles</a>
                <a href={peopleSearch(s.company)} target="_blank" rel="noopener noreferrer" title="Find their product leader or founder to message" style={{ ...btnSecondary, padding:'6px 12px', fontSize:'12px' }}><Users size={11}/> Product leaders</a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
