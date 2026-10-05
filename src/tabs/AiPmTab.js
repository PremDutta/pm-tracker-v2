import React, { useState, useEffect } from 'react';
import { ExternalLink, Search, ClipboardList, Check } from 'lucide-react';
import { GOOGLE_HACKS } from '../data/googleHacks';
import { fillRole } from '../data/roles';
import { COMPANY_DIRECTORY } from '../data/companyDirectory';
import { addApplication, getNetwork } from '../storage';
import { ContactFlag } from '../components/Network';
import HackCard from '../components/HackCard';
import NewBadge from '../components/NewBadge';

// Written every 6 hours by the scanner (agent/ai-roles.json): AI / ML / GenAI
// product roles in India or remote-India, from company boards, VC portfolio
// boards, YC and job aggregators. REACT_APP_AI_ROLES_URL overrides it locally.
export const AI_ROLES_URL = process.env.REACT_APP_AI_ROLES_URL || 'https://raw.githubusercontent.com/PremDutta/pm-tracker-v2/main/agent/ai-roles.json';

export const LEVELS = [
  { id:'pm',         label:'Product Manager' },
  { id:'senior',     label:'Senior PM' },
  { id:'group',      label:'Group / Principal / Lead' },
  { id:'leadership', label:'Head / Director / VP' },
];
const LEVEL_LABEL = Object.fromEntries(LEVELS.map(l => [l.id, l.label]));
const isFresh = (d) => d && Date.now() - new Date(`${d}T00:00:00`).getTime() <= 3 * 86_400_000;

export default function AiPmTab({ t, theme, card, btnPrimary, btnSecondary, badge, role }) {
  const [live, setLive] = useState({ status: 'loading', roles: [] });
  const [levels, setLevels] = useState([]);           // empty = all levels
  const [ycOnly, setYcOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [loggedId, setLoggedId] = useState(null);
  const [network] = useState(() => getNetwork());

  useEffect(() => {
    let cancelled = false;
    fetch(AI_ROLES_URL)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { if (!cancelled) setLive({ status: 'ready', roles: d.roles || [] }); })
      .catch(() => { if (!cancelled) setLive({ status: 'error', roles: [] }); });
    return () => { cancelled = true; };
  }, []);

  const toggleLevel = (id) => setLevels(ls => ls.includes(id) ? ls.filter(l => l !== id) : [...ls, id]);
  const q = query.trim().toLowerCase();
  const anyOld = live.roles.some(r => !isFresh(r.firstSeen));
  const visible = live.roles
    .filter(r => !levels.length || levels.includes(r.level))
    .filter(r => !ycOnly || r.id.startsWith('yc-'))
    .filter(r => !q || `${r.title} ${r.company} ${r.location}`.toLowerCase().includes(q));
  const countBy = (id) => live.roles.filter(r => r.level === id).length;

  const log = (r) => {
    addApplication({ company: r.company, role: r.title, platform: 'AI PM tab', link: r.url });
    setLoggedId(r.id);
    setTimeout(() => setLoggedId(null), 2000);
  };

  const aiHacks = GOOGLE_HACKS.filter(h => h.category === 'ai').map(h => ({ ...h, query: fillRole(h.query, role) }));
  const aiCompanies = COMPANY_DIRECTORY.filter(c => c.sector === 'ai');
  const chip = (active) => ({ padding:'7px 14px', borderRadius:'980px', border:`1px solid ${active ? t.accent : t.border}`, background:active ? t.accent : t.cardBg, color:active ? '#fff' : t.textSecondary, fontSize:'12px', fontWeight:'500', cursor:'pointer', whiteSpace:'nowrap' });

  return (
    <div>
      <div style={{ textAlign:'center', marginBottom:'28px' }}>
        <h2 style={{ fontSize:'34px', fontWeight:'700', letterSpacing:'-0.02em', marginBottom:'10px', display:'inline-flex', alignItems:'center', gap:'10px' }}>
          AI Product Roles <NewBadge id="tab:ai" t={t} style={{ fontSize:'11px', padding:'3px 10px' }} />
        </h2>
        <p style={{ fontSize:'16px', color:t.textSecondary, maxWidth:'640px', margin:'0 auto' }}>
          PM, Senior PM and Group PM roles in AI, ML and GenAI, in India or remote-open-to-India. Collected every 6 hours from 185 companies' job boards, VC portfolio boards and YC startups.
        </p>
      </div>

      {/* Live roles */}
      <div id="ai-roles" style={{ ...card, marginBottom:'24px', scrollMarginTop:'140px' }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', flexWrap:'wrap', gap:'8px', marginBottom:'12px' }}>
          <h3 style={{ margin:0, fontSize:'17px', fontWeight:'600' }}>
            🤖 Open AI product roles
            {live.status === 'ready' && <span style={{ marginLeft:'10px', fontSize:'13px', color:t.textSecondary, fontWeight:'400' }}>{visible.length} of {live.roles.length}</span>}
          </h3>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 12px', borderRadius:'980px', border:`1px solid ${t.border}`, background:t.cardBg, flex:'0 1 260px' }}>
            <Search size={13} style={{ color:t.textTertiary }}/>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search title, company, city" aria-label="Search AI roles"
              style={{ border:'none', outline:'none', background:'transparent', color:t.text, fontSize:'13px', width:'100%' }}/>
          </div>
        </div>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'14px' }}>
          <button onClick={()=>setLevels([])} style={chip(!levels.length)}>All levels</button>
          {LEVELS.map(l => <button key={l.id} onClick={()=>toggleLevel(l.id)} aria-pressed={levels.includes(l.id)} style={chip(levels.includes(l.id))}>{l.label} · {countBy(l.id)}</button>)}
          <button onClick={()=>setYcOnly(v=>!v)} aria-pressed={ycOnly} style={chip(ycOnly)}>🟧 YC startups only</button>
        </div>

        {live.status === 'loading' && <div style={{ fontSize:'13px', color:t.textSecondary }}>Loading AI roles…</div>}
        {live.status === 'error' && <div style={{ fontSize:'13px', color:t.textSecondary }}>Couldn't load live roles right now. The searches below still work.</div>}
        {live.status === 'ready' && visible.length === 0 && <div style={{ fontSize:'13px', color:t.textSecondary }}>No roles match these filters right now. Try another level, or the searches below.</div>}
        {visible.length > 0 && (
          <div style={{ display:'grid', gap:'8px' }}>
            {visible.map(r => (
              <div key={r.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:t.inlineBg, borderRadius:'12px', flexWrap:'wrap' }}>
                <div style={{ flex:'1 1 280px', minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', marginBottom:'3px' }}>
                    <span style={{ fontSize:'14px', fontWeight:'600' }}>{r.title}</span>
                    <span style={{ ...badge(t.badgeText, t.badgeBg), fontSize:'9px' }}>{(LEVEL_LABEL[r.level] || 'PM').toUpperCase()}</span>
                    {r.eligibility === 'remote' && <span style={{ ...badge('#fff', t.success), fontSize:'9px' }}>REMOTE</span>}
                    {r.id.startsWith('yc-') && <span style={{ ...badge('#fff', '#FF6600'), fontSize:'9px' }}>YC</span>}
                    {anyOld && isFresh(r.firstSeen) && <span style={{ ...badge('#fff', t.accent), fontSize:'9px' }}>NEW ROLE</span>}
                  </div>
                  <div style={{ fontSize:'12px', color:t.textSecondary }}>{[r.company, r.location].filter(Boolean).join(' · ')}</div>
                  <ContactFlag company={r.company} t={t} network={network} />
                </div>
                <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, padding:'6px 12px', fontSize:'12px' }}>Apply <ExternalLink size={11}/></a>
                <button onClick={()=>log(r)} aria-label={`Log application: ${r.title} at ${r.company}`} style={{ ...btnSecondary, padding:'6px 12px', fontSize:'12px' }}>
                  {loggedId === r.id ? <><Check size={12}/> Logged!</> : <><ClipboardList size={12}/> Log</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Searches */}
      <h3 id="ai-searches" style={{ margin:'0 0 12px', fontSize:'18px', fontWeight:'600', scrollMarginTop:'140px' }}>
        🔍 AI PM searches <span style={{ fontSize:'13px', color:t.textSecondary, fontWeight:'400' }}>searching for {role.label} (switch at the top right)</span>
      </h3>
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr)', gap:'14px', marginBottom:'28px' }}>
        {aiHacks.map((h, i) => <HackCard key={h.id} h={h} i={i} t={t} theme={theme} card={card} btnPrimary={btnPrimary} btnSecondary={btnSecondary} badge={badge} />)}
      </div>

      {/* AI companies */}
      {aiCompanies.length > 0 && (
        <>
          <h3 style={{ margin:'0 0 12px', fontSize:'18px', fontWeight:'600' }}>🏢 AI companies hiring in India <span style={{ fontSize:'13px', color:t.textSecondary, fontWeight:'400' }}>{aiCompanies.length}</span></h3>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {aiCompanies.map(c => (
              <a key={c.name} href={c.searchUrl || c.careersUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, padding:'7px 14px', fontSize:'12px' }}>
                {c.name}{c.scanned ? '' : ' ↗'} <ExternalLink size={11}/>
              </a>
            ))}
          </div>
          <p style={{ fontSize:'11px', color:t.textTertiary, marginTop:'8px' }}>Companies without ↗ are scanned automatically: their AI roles appear in the list above.</p>
        </>
      )}
    </div>
  );
}
