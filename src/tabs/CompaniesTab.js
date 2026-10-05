import React, { useState, useEffect } from 'react';
import { ExternalLink, Search, ChevronDown, ChevronUp, Plus, Check, RefreshCw } from 'lucide-react';
import { LEVELS } from './AiPmTab';
import { timeAgo } from '../storage';
import { COMPANY_DIRECTORY, COMPANY_DIRECTORY_VERIFIED } from '../data/companyDirectory';
import { addWatchlistCompany, getWatchlist, getNetwork } from '../storage';
import { ContactFlag } from '../components/Network';
import NewBadge from '../components/NewBadge';

// Written every 6 hours by the scanner (agent/company-roles.json), read straight
// from GitHub. REACT_APP_COMPANY_ROLES_URL overrides it for local previews.
export const COMPANY_ROLES_URL = process.env.REACT_APP_COMPANY_ROLES_URL || 'https://raw.githubusercontent.com/PremDutta/pm-tracker-v2/main/agent/company-roles.json';

export const GROUPS = {
  unicorn:           'Indian unicorns',
  ai:                'AI companies',
  big_tech:          'Big tech',
  it_services:       'IT services',
  bfsi_gcc:          'Banks, fintech & GCCs',
  consulting:        'Consulting',
  indian_enterprise: 'Indian enterprise',
  other_mnc:         'Other MNCs',
};

const DAY_MS = 86_400_000;
const isFresh = (isoDay) => isoDay && (Date.now() - new Date(`${isoDay}T00:00:00`).getTime()) <= 3 * DAY_MS;
const googleRoles = (name, role) => `https://www.google.com/search?q=${encodeURIComponent(`"${name}" ${role.searchTerm} India (careers OR jobs)`)}&tbs=qdr:m`;

export default function CompaniesTab({ t, card, btnSecondary, badge, role, focus }) {
  const [live, setLive] = useState({ status: 'loading', roles: {}, lastRead: {}, scannedAt: null });
  const [reload, setReload] = useState(0);
  const [levels, setLevels] = useState([]);   // empty = all levels
  const [city, setCity] = useState('all');
  const [newOnly, setNewOnly] = useState(false);
  const [group, setGroup] = useState(focus?.companyGroup || 'all');
  // "Go to feature" from the announcements opens a specific group.
  useEffect(() => { if (focus?.companyGroup) setGroup(focus.companyGroup); }, [focus?.nonce, focus?.companyGroup]);
  const [query, setQuery] = useState('');
  const [hiringOnly, setHiringOnly] = useState(false);
  const [open, setOpen] = useState(null);
  const [watched, setWatched] = useState(() => new Set(getWatchlist().map(w => w.company.toLowerCase())));
  const [network] = useState(() => getNetwork());

  // Refresh re-reads the scanner's latest file (the cache-buster skips the CDN copy).
  useEffect(() => {
    let cancelled = false;
    setLive(l => ({ ...l, status: l.status === 'ready' ? 'refreshing' : 'loading' }));
    fetch(reload ? `${COMPANY_ROLES_URL}?t=${Date.now()}` : COMPANY_ROLES_URL)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { if (!cancelled) setLive({ status: 'ready', roles: d.roles || {}, lastRead: d.lastRead || {}, scannedAt: d.scannedAt || null }); })
      .catch(() => { if (!cancelled) setLive(l => ({ ...l, status: Object.keys(l.roles).length ? 'ready' : 'error' })); });
    return () => { cancelled = true; };
  }, [reload]);

  // Role filters apply to the counts, the "Hiring PMs now" filter and the expanded lists.
  const CITIES = ['Bengaluru|Bangalore', 'Delhi|Gurugram|Gurgaon|Noida|NCR', 'Hyderabad', 'Mumbai', 'Pune', 'Chennai', 'Remote'];
  const cityLabel = (c) => c.split('|')[0] + (c.startsWith('Delhi') ? ' NCR' : '');
  const roleMatches = (r) =>
    (!levels.length || levels.includes(r.level || 'pm')) &&
    (city === 'all' || new RegExp(city, 'i').test(r.location || '')) &&
    (!newOnly || isFresh(r.firstSeen));
  const allRolesOf = (c) => live.roles[c.name] || [];
  const rolesOf = (c) => allRolesOf(c).filter(roleMatches);
  const filtersOn = levels.length > 0 || city !== 'all' || newOnly;
  const q = query.trim().toLowerCase();
  const visible = COMPANY_DIRECTORY
    .filter(c => group === 'all' || c.group === group)
    .filter(c => !q || [c.name, c.sector, GROUPS[c.group]].some(f => f && f.toLowerCase().includes(q)))
    .filter(c => !(hiringOnly || filtersOn) || rolesOf(c).length > 0)
    .sort((a, b) => rolesOf(b).length - rolesOf(a).length || a.name.localeCompare(b.name));

  const counts = COMPANY_DIRECTORY.reduce((acc, c) => ({ ...acc, [c.group]: (acc[c.group] || 0) + 1 }), {});
  const scannedCount = COMPANY_DIRECTORY.filter(c => c.scanned).length;
  const openTotal = COMPANY_DIRECTORY.reduce((n, c) => n + rolesOf(c).length, 0);
  const hiringCompanies = COMPANY_DIRECTORY.filter(c => rolesOf(c).length > 0).length;

  const watch = (c) => {
    addWatchlistCompany({ company: c.name, careersUrl: c.careersUrl, role: role.keyword, domain: '', ats: '', atsSlug: '' });
    setWatched(new Set([...watched, c.name.toLowerCase()]));
  };

  const chip = (active) => ({ padding:'7px 14px', borderRadius:'980px', border:`1px solid ${active ? t.accent : t.border}`, background:active ? t.accent : t.cardBg, color:active ? '#fff' : t.textSecondary, fontSize:'12px', fontWeight:'500', cursor:'pointer', whiteSpace:'nowrap' });

  return (
    <div>
      <div style={{ textAlign:'center', marginBottom:'28px' }}>
        <h2 style={{ fontSize:'34px', fontWeight:'700', letterSpacing:'-0.02em', marginBottom:'10px', display:'inline-flex', alignItems:'center', gap:'10px' }}>
          Top Companies <NewBadge id="tab:companies" t={t} style={{ fontSize:'11px', padding:'3px 10px' }} />
        </h2>
        <p style={{ fontSize:'16px', color:t.textSecondary, maxWidth:'640px', margin:'0 auto' }}>
          {COMPANY_DIRECTORY.length} MNCs, IT majors, big tech and Indian unicorns with their careers pages. For the {scannedCount} with a readable job feed, open product roles in India are checked every 6 hours.
        </p>
        {(live.status === 'ready' || live.status === 'refreshing') && (
          <p style={{ fontSize:'13px', color:t.success, marginTop:'8px', fontWeight:'600' }}>{openTotal} open product roles in India{filtersOn ? ' matching your filters' : ' right now'}, across {hiringCompanies} companies</p>
        )}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', marginTop:'10px', flexWrap:'wrap', fontSize:'12px', color:t.textSecondary }}>
          <span>Auto-scanned every 6 hours{live.scannedAt ? ` · last scan ${timeAgo(Date.parse(live.scannedAt))}` : ''}</span>
          <button onClick={()=>setReload(n=>n+1)} disabled={live.status === 'refreshing' || live.status === 'loading'} aria-label="Refresh roles"
            style={{ ...btnSecondary, padding:'5px 12px', fontSize:'12px' }}>
            <RefreshCw size={12} style={{ animation: live.status === 'refreshing' ? 'spin 1s linear infinite' : 'none' }}/> {live.status === 'refreshing' ? 'Refreshing…' : 'Refresh'}
          </button>
          <a href="https://github.com/PremDutta/pm-tracker-v2/actions/workflows/job-scan.yml" target="_blank" rel="noopener noreferrer"
            title="Opens the scanner on GitHub: press 'Run workflow' to scan now (repo owner only). Takes ~2 minutes, then hit Refresh."
            style={{ color:t.accent, textDecoration:'none' }}>Run a fresh scan ↗</a>
        </div>
        {live.status === 'error' && <p style={{ fontSize:'13px', color:t.textTertiary, marginTop:'8px' }}>Couldn't load live roles right now; careers links below still work.</p>}
      </div>

      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center', marginBottom:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'7px 14px', borderRadius:'980px', border:`1px solid ${t.border}`, background:t.cardBg, flex:'1 1 220px', maxWidth:'320px' }}>
          <Search size={14} style={{ color:t.textTertiary }}/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search companies or sectors" aria-label="Search companies"
            style={{ border:'none', outline:'none', background:'transparent', color:t.text, fontSize:'13px', width:'100%' }}/>
        </div>
        <button onClick={()=>setHiringOnly(v=>!v)} style={chip(hiringOnly)}>Hiring PMs now</button>
        <button onClick={()=>setNewOnly(v=>!v)} aria-pressed={newOnly} style={chip(newOnly)}>New (3 days)</button>
        <select value={city} onChange={e=>setCity(e.target.value)} aria-label="Filter roles by city"
          style={{ ...chip(city !== 'all'), appearance:'auto' }}>
          <option value="all">All cities</option>
          {CITIES.map(c => <option key={c} value={c}>{cityLabel(c)}</option>)}
        </select>
      </div>
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'12px' }}>
        <button onClick={()=>setLevels([])} style={chip(!levels.length)}>All levels</button>
        {LEVELS.map(l => (
          <button key={l.id} onClick={()=>setLevels(ls => ls.includes(l.id) ? ls.filter(x => x !== l.id) : [...ls, l.id])} aria-pressed={levels.includes(l.id)} style={chip(levels.includes(l.id))}>{l.label}</button>
        ))}
      </div>
      <div style={{ display:'flex', gap:'6px', overflowX:'auto', paddingBottom:'6px', marginBottom:'16px' }}>
        <button onClick={()=>setGroup('all')} style={chip(group==='all')}>All · {COMPANY_DIRECTORY.length}</button>
        {Object.entries(GROUPS).filter(([id]) => counts[id]).map(([id, label]) => (
          <button key={id} onClick={()=>setGroup(id)} style={chip(group===id)}>{label} · {counts[id]}</button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div style={{ ...card, textAlign:'center', color:t.textSecondary, fontSize:'14px' }}>No companies match. Try clearing the search or filters.</div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'12px', alignItems:'start' }}>
          {visible.map(c => {
            const roles = rolesOf(c);
            const isOpen = open === c.name;
            // On a company's first read every role is "new"; only highlight new
            // roles once some older ones exist, so NEW means posted since we started watching.
            const fresh = (r) => isFresh(r.firstSeen) && allRolesOf(c).some(o => !isFresh(o.firstSeen));
            const newCount = roles.filter(fresh).length;
            return (
              <div key={c.name} style={{ ...card, padding:'16px 18px', display:'flex', flexDirection:'column', gap:'8px', minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'15px', fontWeight:'600' }}>{c.name}</span>
                  <span style={{ ...badge(t.badgeText, t.badgeBg), fontSize:'9px' }}>{c.group === 'unicorn' && c.sector ? c.sector.toUpperCase() : GROUPS[c.group]}</span>
                  {c.status === 'listed' && <span style={{ ...badge(t.badgeText, t.badgeBg), fontSize:'9px' }}>LISTED</span>}
                </div>
                <ContactFlag company={c.name} t={t} network={network} />
                <div style={{ fontSize:'12px', color: roles.length ? t.success : t.textTertiary, fontWeight: roles.length ? 600 : 400 }}>
                  {c.scanned
                    ? (live.status === 'loading' ? 'Checking open roles…'
                      : roles.length ? `${roles.length} open product role${roles.length === 1 ? '' : 's'} in India${newCount ? ` · ${newCount} new` : ''}`
                        : 'No open product roles in India right now')
                    : `Not auto-scanned (${c.ats === 'custom' || c.ats === 'unknown' ? 'custom careers site' : c.ats}): use the links`}
                </div>
                {c.note && <div style={{ fontSize:'11px', color:t.textTertiary }}>{c.note}</div>}
                {isOpen && roles.length > 0 && (
                  <div style={{ display:'grid', gap:'6px' }}>
                    {roles.map(r => (
                      <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" style={{ display:'block', padding:'8px 10px', background:t.inlineBg, borderRadius:'10px', textDecoration:'none', color:t.text, fontSize:'12px' }}>
                        <span style={{ fontWeight:600 }}>{r.title}</span>
                        {fresh(r) && <span style={{ ...badge('#fff', t.accent), fontSize:'8px', marginLeft:'6px' }}>NEW ROLE</span>}
                        <span style={{ color:t.textSecondary }}> · {r.location}</span>
                      </a>
                    ))}
                  </div>
                )}
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'auto', flexWrap:'wrap' }}>
                  {roles.length > 0 && (
                    <button onClick={()=>setOpen(isOpen ? null : c.name)} aria-expanded={isOpen} aria-label={`${isOpen ? 'Hide' : 'Show'} open roles at ${c.name}`} style={{ ...btnSecondary, padding:'6px 12px', fontSize:'12px' }}>
                      {isOpen ? <ChevronUp size={12}/> : <ChevronDown size={12}/>} Roles
                    </button>
                  )}
                  <a href={c.searchUrl || c.careersUrl} target="_blank" rel="noopener noreferrer" aria-label={`${c.name} careers`} style={{ ...btnSecondary, padding:'6px 12px', fontSize:'12px' }}>Careers <ExternalLink size={11}/></a>
                  <a href={googleRoles(c.name, role)} target="_blank" rel="noopener noreferrer" title="Google their PM roles in India, past month" style={{ ...btnSecondary, padding:'6px 12px', fontSize:'12px' }}><Search size={11}/> Google</a>
                  <button onClick={()=>watch(c)} disabled={watched.has(c.name.toLowerCase())} aria-label={`Add ${c.name} to Watchlist`} style={{ ...btnSecondary, padding:'6px 12px', fontSize:'12px', opacity: watched.has(c.name.toLowerCase()) ? 0.6 : 1 }}>
                    {watched.has(c.name.toLowerCase()) ? <><Check size={12}/> Watching</> : <><Plus size={12}/> Watch</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ fontSize:'11px', color:t.textTertiary, marginTop:'20px', textAlign:'center' }}>
        Careers pages and job feeds verified {COMPANY_DIRECTORY_VERIFIED}. "Not auto-scanned" companies use custom career sites with no public job feed, or block automated requests.
      </p>
    </div>
  );
}
