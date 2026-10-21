import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { LEVELS } from '../tabs/AiPmTab';
import NewBadge from './NewBadge';

// Written every 6 hours by the scanner (agent/global-roles.json): PM roles
// outside India from the company boards it already reads.
export const GLOBAL_ROLES_URL = process.env.REACT_APP_GLOBAL_ROLES_URL || 'https://raw.githubusercontent.com/PremDutta/pm-tracker-v2/main/agent/global-roles.json';

export const REGIONS = [
  ['singapore', '🇸🇬 Singapore'], ['uae', '🇦🇪 UAE'], ['saudi', '🇸🇦 Saudi'], ['uk', '🇬🇧 UK'], ['europe', '🇪🇺 Europe'],
  ['us', '🇺🇸 US'], ['canada', '🇨🇦 Canada'], ['australia', '🇦🇺 Australia'], ['apac', '🌏 Other APAC'],
];

export default function GlobalRoles({ t, card, btnSecondary, badge }) {
  const [roles, setRoles] = useState(null);
  const [region, setRegion] = useState('singapore');
  const [level, setLevel] = useState('all');
  useEffect(() => {
    fetch(GLOBAL_ROLES_URL).then(r => r.ok ? r.json() : Promise.reject()).then(d => setRoles(d.roles || [])).catch(() => setRoles([]));
  }, []);

  const count = (id) => (roles || []).filter(r => r.regions?.includes(id)).length;
  const shown = (roles || []).filter(r => r.regions?.includes(region) && (level === 'all' || r.level === level));
  const chip = (on) => ({ padding:'7px 12px', borderRadius:'980px', border:`1px solid ${on ? t.accent : t.border}`, background:on ? t.accent : t.cardBg, color:on ? '#fff' : t.textSecondary, fontSize:'12px', cursor:'pointer', whiteSpace:'nowrap' });

  return (
    <div id="global-roles" style={{ ...card, marginBottom:'24px', scrollMarginTop:'140px' }}>
      <h3 style={{ margin:'0 0 4px', fontSize:'17px', fontWeight:600, display:'flex', alignItems:'center', gap:'8px' }}>🌍 Live PM roles abroad <NewBadge id="intl:global" t={t} /></h3>
      <p style={{ margin:'0 0 12px', fontSize:'12px', color:t.textSecondary }}>From the company job boards the scanner reads every 6 hours. Big-company feeds (Workday, Amazon, Microsoft...) are India-only, so use the boards below for those.</p>
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'8px' }}>
        {REGIONS.map(([id, label]) => <button key={id} onClick={() => setRegion(id)} aria-pressed={region === id} style={chip(region === id)}>{label} · {count(id)}</button>)}
      </div>
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'12px' }}>
        {[['all', 'All levels'], ...LEVELS.map(l => [l.id, l.label])].map(([id, label]) => <button key={id} onClick={() => setLevel(id)} style={chip(level === id)}>{label}</button>)}
      </div>
      {roles === null ? <div style={{ fontSize:'13px', color:t.textSecondary }}>Loading…</div>
        : shown.length === 0 ? <div style={{ fontSize:'13px', color:t.textSecondary }}>No roles here right now. Try another region or level.</div>
        : <div style={{ display:'grid', gap:'8px' }}>
            {shown.slice(0, 60).map(r => (
              <div key={r.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', padding:'10px 14px', background:t.inlineBg, borderRadius:'12px', flexWrap:'wrap' }}>
                <div style={{ minWidth:0, flex:'1 1 260px' }}>
                  <span style={{ fontSize:'14px', fontWeight:600 }}>{r.title}</span>
                  <div style={{ fontSize:'12px', color:t.textSecondary }}>{r.company} · {r.location}</div>
                </div>
                <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, padding:'6px 12px', fontSize:'12px' }}>View <ExternalLink size={11}/></a>
              </div>
            ))}
          </div>}
    </div>
  );
}
