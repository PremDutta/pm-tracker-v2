import React, { useState, useEffect } from 'react';
import { ExternalLink, Search, ClipboardList, Check } from 'lucide-react';
import { GOVT_ORGS, GOVT_CATEGORIES, GOVT_BOARDS, GOVT_SEARCHES, GOVT_REGISTRY_VERIFIED, googleUrl, orgPmSearchUrl } from '../data/govtOrgs';
import { getPlatformMeta, markPlatformChecked, addApplication, timeAgo } from '../storage';

const GOVT_TIPS = [
  { icon:'🏷️', text:'Titles differ: look for Consultant, Specialist Officer, Manager (Digital), or Lead / Senior Associate - Product.' },
  { icon:'📄', text:'Most PSUs publish openings as PDF notices with a hard last date. Check each careers page weekly, not monthly.' },
  { icon:'🎂', text:'Check the age limit and "as on" date in the notice first. Many roles cap at 35-45 for contract and lateral posts.' },
  { icon:'🤝', text:'Contract / consultant roles (1-3 years) are the usual entry for private-sector PMs. Skip "on deputation" roles, which are for serving govt employees.' },
];

// "Last checked" lives in the same per-platform meta store as the All Jobs
// grid, namespaced so a govt org id can never collide with a platform id.
const metaKey = (org) => `govt-${org.id}`;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Written every 6 hours by the background scanner (agent/govt-openings.json),
// read straight from GitHub so it's fresh without redeploying the app.
// REACT_APP_GOVT_OPENINGS_URL overrides it for local previews.
export const GOVT_OPENINGS_URL = process.env.REACT_APP_GOVT_OPENINGS_URL || 'https://raw.githubusercontent.com/PremDutta/pm-tracker-v2/main/agent/govt-openings.json';
const FLAG_LABELS = { age_limit_mentioned: 'Age limit', mba_mentioned: 'MBA asked', contract: 'Contract', corrigendum: 'Corrigendum' };

const localToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysUntil = (isoDay) => Math.round((new Date(`${isoDay}T00:00:00`) - localToday()) / DAY_MS);
const byUrgency = (a, b) =>
  (a.deadline ? daysUntil(a.deadline) : 9999) - (b.deadline ? daysUntil(b.deadline) : 9999) ||
  (b.firstSeen || '').localeCompare(a.firstSeen || '');

function useGovtOpenings() {
  const [state, setState] = useState({ status: 'loading', openings: [] });
  useEffect(() => {
    let cancelled = false;
    fetch(GOVT_OPENINGS_URL)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { if (!cancelled) setState({ status: 'ready', openings: d.openings || [] }); })
      .catch(() => { if (!cancelled) setState({ status: 'error', openings: [] }); });
    return () => { cancelled = true; };
  }, []);
  return state;
}

export default function GovtTab({ t, card, btnSecondary, badge }) {
  const [meta, setMeta] = useState(() => getPlatformMeta());
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [highOnly, setHighOnly] = useState(false);
  const [staleFirst, setStaleFirst] = useState(false);
  const [loggedId, setLoggedId] = useState(null);
  const live = useGovtOpenings();
  const openNow = live.openings.filter(o => !o.deadline || daysUntil(o.deadline) >= 0).sort(byUrgency);

  const logOpening = (o) => {
    addApplication({ company: o.company, role: o.title, platform: `Govt (${o.org})`, link: o.url });
    setLoggedId(o.id);
    setTimeout(() => setLoggedId(null), 2000);
  };

  const trackCheck = (org) => setMeta(markPlatformChecked(metaKey(org)));
  const lastChecked = (org) => meta[metaKey(org)]?.lastChecked;

  const q = query.trim().toLowerCase();
  const visible = GOVT_ORGS
    .filter(o => category === 'all' || o.category === category)
    .filter(o => !highOnly || o.relevance === 'high')
    .filter(o => !q || [o.short, o.name, o.parent, o.location].some(f => f && f.toLowerCase().includes(q)));
  if (staleFirst) visible.sort((a, b) => (lastChecked(a) || 0) - (lastChecked(b) || 0));

  const dueCount = GOVT_ORGS.filter(o => !lastChecked(o) || Date.now() - lastChecked(o) > WEEK_MS).length;
  const categoryCounts = GOVT_ORGS.reduce((acc, o) => ({ ...acc, [o.category]: (acc[o.category] || 0) + 1 }), {});

  const chip = (active) => ({ padding:'7px 14px', borderRadius:'980px', border:`1px solid ${active ? t.accent : t.border}`, background:active ? t.accent : t.cardBg, color:active ? '#fff' : t.textSecondary, fontSize:'12px', fontWeight:'500', cursor:'pointer', whiteSpace:'nowrap' });

  return (
    <div>
      <div style={{ textAlign:'center', marginBottom:'32px' }}>
        <h2 style={{ fontSize:'34px', fontWeight:'700', letterSpacing:'-0.02em', marginBottom:'10px' }}>Government & PSU</h2>
        <p style={{ fontSize:'16px', color:t.textSecondary }}>Product roles at {GOVT_ORGS.length} government, PSU and government-backed orgs, from NPCI and ONDC to PSU banks</p>
      </div>

      {/* Live openings from the scanner */}
      <div style={{ ...card, marginBottom:'20px' }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', flexWrap:'wrap', gap:'8px', marginBottom:'14px' }}>
          <h3 style={{ margin:0, fontSize:'17px', fontWeight:'600' }}>
            🟢 Open govt product roles
            {live.status === 'ready' && <span style={{ marginLeft:'10px', fontSize:'13px', color:t.textSecondary, fontWeight:'400' }}>{openNow.length} open</span>}
          </h3>
          <span style={{ fontSize:'11px', color:t.textTertiary }}>Auto-scanned every 6h: NPCI, RBIH, DIC/NeGD, CSC, NHAI, Bharat Digital</span>
        </div>
        {live.status === 'loading' && <div style={{ fontSize:'13px', color:t.textSecondary }}>Loading live openings…</div>}
        {live.status === 'error' && <div style={{ fontSize:'13px', color:t.textSecondary }}>Couldn't load live openings right now. The org directory below still works.</div>}
        {live.status === 'ready' && openNow.length === 0 && <div style={{ fontSize:'13px', color:t.textSecondary }}>No open product roles on the scanned boards right now. Check the PDF-only orgs below.</div>}
        {openNow.length > 0 && (
          <div style={{ display:'grid', gap:'8px' }}>
            {openNow.map(o => {
              const left = o.deadline ? daysUntil(o.deadline) : null;
              const isNew = o.firstSeen && daysUntil(o.firstSeen) >= -3;
              return (
                <div key={o.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:t.inlineBg, borderRadius:'12px', flexWrap:'wrap' }}>
                  <div style={{ flex:'1 1 260px', minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', marginBottom:'3px' }}>
                      <span style={{ fontSize:'14px', fontWeight:'600' }}>{o.title}</span>
                      {isNew && <span style={{ ...badge('#fff', t.accent), fontSize:'9px' }}>NEW</span>}
                      {left !== null && <span style={{ ...badge('#fff', left <= 3 ? t.error : t.warning), fontSize:'9px' }}>{left === 0 ? 'CLOSES TODAY' : `CLOSES IN ${left}D`}</span>}
                      {(o.flags || []).filter(f => FLAG_LABELS[f]).map(f => <span key={f} style={{ ...badge(t.badgeText, t.badgeBg), fontSize:'9px' }}>{FLAG_LABELS[f]}</span>)}
                    </div>
                    <div style={{ fontSize:'12px', color:t.textSecondary }}>{[o.company, o.location, o.deadline && `last date ${o.deadline}`].filter(Boolean).join(' · ')}</div>
                  </div>
                  <a href={o.url} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, padding:'6px 12px', fontSize:'12px' }}>Apply <ExternalLink size={11}/></a>
                  <button onClick={()=>logOpening(o)} aria-label={`Log application: ${o.title}`} style={{ ...btnSecondary, padding:'6px 12px', fontSize:'12px' }}>
                    {loggedId === o.id ? <><Check size={12}/> Logged!</> : <><ClipboardList size={12}/> Log</>}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* How govt hiring differs */}
      <div style={{ ...card, marginBottom:'20px' }}>
        <h3 style={{ margin:'0 0 14px', fontSize:'17px', fontWeight:'600' }}>🏛️ How public-sector PM hiring differs</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:'10px' }}>
          {GOVT_TIPS.map((tip, i) => (
            <div key={i} style={{ padding:'12px 14px', background:t.inlineBg, borderRadius:'12px', fontSize:'13px', lineHeight:1.5, display:'flex', gap:'10px' }}>
              <span style={{ fontSize:'18px' }}>{tip.icon}</span><span>{tip.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Boards + searches */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:'20px', marginBottom:'28px' }}>
        <div style={card}>
          <h3 style={{ margin:'0 0 14px', fontSize:'17px', fontWeight:'600' }}>📋 Govt job boards</h3>
          <div style={{ display:'grid', gap:'8px' }}>
            {GOVT_BOARDS.map(b => (
              <div key={b.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:t.inlineBg, borderRadius:'12px', gap:'12px' }}>
                <span style={{ fontSize:'13px' }}><strong>{b.name}</strong><span style={{ color:t.textSecondary }}> · {b.tip}</span></span>
                <a href={b.url} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, padding:'6px 12px', fontSize:'12px', flexShrink:0 }}>Open <ExternalLink size={11}/></a>
              </div>
            ))}
          </div>
        </div>
        <div style={card}>
          <h3 style={{ margin:'0 0 14px', fontSize:'17px', fontWeight:'600' }}>🔍 Google searches (past month)</h3>
          <div style={{ display:'grid', gap:'8px' }}>
            {GOVT_SEARCHES.map(s => (
              <a key={s.title} href={googleUrl(s.query)} target="_blank" rel="noopener noreferrer" style={{ display:'block', padding:'10px 14px', background:t.inlineBg, borderRadius:'12px', textDecoration:'none', color:t.text }}>
                <div style={{ fontSize:'13px', fontWeight:'600', marginBottom:'3px', display:'flex', alignItems:'center', gap:'6px' }}>{s.title} <ExternalLink size={11} style={{ color:t.textTertiary }}/></div>
                <code style={{ fontSize:'11px', color:t.codeColor, wordBreak:'break-word' }}>{s.query}</code>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Org directory */}
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', flexWrap:'wrap', gap:'10px', marginBottom:'14px' }}>
        <h3 style={{ margin:0, fontSize:'18px', fontWeight:'600' }}>
          🏢 Organisations
          <span style={{ marginLeft:'10px', fontSize:'13px', color:t.textSecondary, fontWeight:'400' }}>{visible.length} shown</span>
        </h3>
        <span style={{ fontSize:'12px', color:dueCount ? t.warning : t.success }}>
          {dueCount ? `${dueCount} not checked in the last 7 days` : 'All checked this week ✓'}
        </span>
      </div>

      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center', marginBottom:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'7px 14px', borderRadius:'980px', border:`1px solid ${t.border}`, background:t.cardBg, flex:'1 1 220px', maxWidth:'320px' }}>
          <Search size={14} style={{ color:t.textTertiary }}/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search orgs, ministries, cities" aria-label="Search government organisations"
            style={{ border:'none', outline:'none', background:'transparent', color:t.text, fontSize:'13px', width:'100%' }}/>
        </div>
        <button onClick={()=>setHighOnly(v=>!v)} style={chip(highOnly)}>High PM relevance only</button>
        <button onClick={()=>setStaleFirst(v=>!v)} style={chip(staleFirst)}>Least recently checked first</button>
      </div>
      <div style={{ display:'flex', gap:'6px', overflowX:'auto', paddingBottom:'6px', marginBottom:'16px' }}>
        <button onClick={()=>setCategory('all')} style={chip(category==='all')}>All · {GOVT_ORGS.length}</button>
        {Object.entries(GOVT_CATEGORIES).filter(([id]) => categoryCounts[id]).map(([id, label]) => (
          <button key={id} onClick={()=>setCategory(id)} style={chip(category===id)}>{label} · {categoryCounts[id]}</button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div style={{ ...card, textAlign:'center', color:t.textSecondary, fontSize:'14px' }}>No organisations match. Try clearing the search or filters.</div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:'12px' }}>
          {visible.map(o => {
            const checked = lastChecked(o);
            const stale = !checked || Date.now() - checked > WEEK_MS;
            return (
              <div key={o.id} style={{ ...card, padding:'16px 18px', display:'flex', flexDirection:'column', gap:'8px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'15px', fontWeight:'600' }}>{o.short}</span>
                  <span style={{ ...badge(t.badgeText, t.badgeBg), fontSize:'9px' }}>{GOVT_CATEGORIES[o.category]}</span>
                  {o.relevance === 'high' && <span style={{ ...badge('#fff', t.success), fontSize:'9px' }}>HIRES PMs</span>}
                </div>
                <div style={{ fontSize:'12px', color:t.textSecondary, lineHeight:1.4 }}>
                  {o.name !== o.short && <div>{o.name}</div>}
                  <div style={{ color:t.textTertiary }}>{[o.parent, o.location].filter(Boolean).join(' · ')}</div>
                  {o.listedOn && <div style={{ color:t.textTertiary }}>Openings listed on the {o.listedOn} portal</div>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'auto', flexWrap:'wrap' }}>
                  <a href={o.careersUrl} target="_blank" rel="noopener noreferrer" onClick={()=>trackCheck(o)} aria-label={`${o.short} careers page`}
                    style={{ ...btnSecondary, padding:'6px 12px', fontSize:'12px' }}>Careers <ExternalLink size={11}/></a>
                  <a href={orgPmSearchUrl(o)} target="_blank" rel="noopener noreferrer" title={`Google this org's site for product / digital openings`}
                    style={{ ...btnSecondary, padding:'6px 12px', fontSize:'12px' }}><Search size={11}/> Search site</a>
                  <span style={{ fontSize:'10px', color:stale ? t.warning : t.textTertiary, marginLeft:'auto' }}>
                    {checked ? `Checked ${timeAgo(checked)}` : 'Not checked yet'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ fontSize:'11px', color:t.textTertiary, marginTop:'20px', textAlign:'center' }}>
        Org list from the india-govt-search registry (verified {GOVT_REGISTRY_VERIFIED}); links re-checked weekly. Some govt sites block automated checks but work in a browser.
      </p>
    </div>
  );
}
