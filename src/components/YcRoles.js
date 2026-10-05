import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import NewBadge from './NewBadge';

// Written every 6 hours by the scanner (agent/yc-roles.json): PM roles at Y
// Combinator startups that are India-based or remote-open-to-India.
export const YC_ROLES_URL = process.env.REACT_APP_YC_ROLES_URL || 'https://raw.githubusercontent.com/PremDutta/pm-tracker-v2/main/agent/yc-roles.json';

export default function YcRoles({ t, card, btnSecondary, badge }) {
  const [live, setLive] = useState({ status: 'loading', roles: [] });
  useEffect(() => {
    let cancelled = false;
    fetch(YC_ROLES_URL)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { if (!cancelled) setLive({ status: 'ready', roles: d.roles || [] }); })
      .catch(() => { if (!cancelled) setLive({ status: 'error', roles: [] }); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div id="yc-roles" style={{ ...card, marginBottom:'20px', scrollMarginTop:'140px' }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', flexWrap:'wrap', gap:'8px', marginBottom:'12px' }}>
        <h3 style={{ margin:0, fontSize:'17px', fontWeight:'600', display:'flex', alignItems:'center', gap:'8px' }}>
          🟧 YC startups: PM roles open to India <NewBadge id="remote:yc" t={t} />
          {live.status === 'ready' && <span style={{ fontSize:'13px', color:t.textSecondary, fontWeight:'400' }}>{live.roles.length}</span>}
        </h3>
        <a href="https://www.ycombinator.com/jobs/role/product-manager" target="_blank" rel="noopener noreferrer" style={{ fontSize:'12px', color:t.accent, textDecoration:'none' }}>All YC PM jobs ↗</a>
      </div>
      <p style={{ margin:'0 0 12px', fontSize:'12px', color:t.textSecondary }}>India-based, or remote with India allowed ("Remote (US)" and other country-limited remote roles are left out). Checked every 6 hours.</p>
      {live.status === 'loading' && <div style={{ fontSize:'13px', color:t.textSecondary }}>Loading YC roles…</div>}
      {live.status === 'error' && <div style={{ fontSize:'13px', color:t.textSecondary }}>Couldn't load YC roles right now; use the link above.</div>}
      {live.status === 'ready' && live.roles.length === 0 && <div style={{ fontSize:'13px', color:t.textSecondary }}>No YC PM roles open to India right now.</div>}
      {live.roles.length > 0 && (
        <div style={{ display:'grid', gap:'8px' }}>
          {live.roles.map(r => (
            <div key={r.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', padding:'10px 14px', background:t.inlineBg, borderRadius:'12px', flexWrap:'wrap' }}>
              <div style={{ minWidth:0, flex:'1 1 260px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'14px', fontWeight:'600' }}>{r.title}</span>
                  <span style={{ ...badge('#fff', r.eligibility === 'remote' ? t.success : t.accent), fontSize:'9px' }}>{r.eligibility === 'remote' ? 'REMOTE' : 'INDIA'}</span>
                </div>
                <div style={{ fontSize:'12px', color:t.textSecondary }}>{r.company} · {r.location}</div>
              </div>
              <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, padding:'6px 12px', fontSize:'12px' }}>View <ExternalLink size={11}/></a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
