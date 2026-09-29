import React, { useState } from 'react';
import { Search, Copy, Check } from 'lucide-react';
import { GOOGLE_HACKS, HACK_CATEGORIES } from '../data/googleHacks';
import { fillRole } from '../data/roles';
import NewBadge from '../components/NewBadge';

// Google URL for a hack: timeFilter = past 24h (older cards), tbs = any Google
// time filter (qdr:w / qdr:m), news = search Google News instead of the web.
const searchUrl = (h) => 'https://www.google.com/search?q=' + encodeURIComponent(h.query) +
  (h.tbs ? `&tbs=${h.tbs}` : h.timeFilter ? '&tbs=qdr:d' : '') + (h.news ? '&tbm=nws' : '');
const TIME_LABELS = { 'qdr:d': 'Past 24 hours', 'qdr:w': 'Past week', 'qdr:m': 'Past month' };
const filterLabel = (h) => [TIME_LABELS[h.tbs || (h.timeFilter ? 'qdr:d' : '')], h.news && 'Google News'].filter(Boolean).join(' · ');

export default function HacksTab({ t, theme, card, btnPrimary, btnSecondary, badge, isLoaded, role }) {
  const [hackCategory, setHackCategory] = useState('all');
  const [copiedId, setCopiedId] = useState(null);

  const hacks = GOOGLE_HACKS.map(h => ({ ...h, query: fillRole(h.query, role), googleJobsUrl: fillRole(h.googleJobsUrl, role) }));
  const filteredHacks = hackCategory === 'all' ? hacks : hacks.filter(h => h.category === hackCategory);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).catch(() => {}).finally(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div>
      <div style={{ textAlign:'center', marginBottom:'40px' }}>
        <h2 style={{ fontSize:'34px', fontWeight:'700', letterSpacing:'-0.02em', marginBottom:'10px' }}>{GOOGLE_HACKS.length} Google Search Hacks</h2>
        <p style={{ fontSize:'16px', color:t.textSecondary, maxWidth:'520px', margin:'0 auto' }}>Discover jobs before they hit job boards. Find hidden listings, referral opportunities, and salary-transparent roles.</p>
        <p style={{ fontSize:'13px', color:t.textTertiary, marginTop:'8px' }}>Searching for <strong style={{ color:t.text }}>{role.label}</strong>: <code style={{ color:t.codeColor }}>{role.searchTerm}</code> (switch at the top right)</p>
      </div>

      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'28px' }}>
        {HACK_CATEGORIES.map(c => (
          <button key={c.id} onClick={()=>setHackCategory(c.id)} style={{ padding:'8px 16px', background:hackCategory===c.id?t.accent:t.cardBg, border:`1px solid ${hackCategory===c.id?t.accent:t.border}`, borderRadius:'980px', color:hackCategory===c.id?'#fff':t.text, fontSize:'13px', fontWeight:'500', cursor:'pointer', transition:'all 0.2s ease' }}>
            {c.icon} {c.label} <NewBadge id={`hack-cat:${c.id}`} t={t} style={{ marginLeft:'4px' }} />
          </button>
        ))}
      </div>

      {/* minmax(0,1fr): without it a long no-wrap query widens the grid track past
          the viewport and pushes "Search Now" off-screen. */}
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr)', gap:'14px' }}>
        {filteredHacks.map((h,i) => (
          <div key={h.id} style={{ ...card, minWidth:0, opacity:isLoaded?1:0, transform:isLoaded?'translateY(0)':'translateY(10px)', transition:`all 0.4s ease ${i*0.04}s` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px', flexWrap:'wrap', gap:'14px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <span style={{ fontSize:'26px' }}>{h.icon}</span>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'3px' }}>
                    <h3 style={{ margin:0, fontSize:'16px', fontWeight:'600' }}>{h.title}</h3>
                    <NewBadge id={`hack:${h.id}`} t={t} />
                    {h.badge && <span style={{ ...badge(theme==='dark'?'#FFD60A':'#92400e','rgba(255,214,10,0.18)') }}>{h.badge}</span>}
                  </div>
                  <p style={{ margin:0, fontSize:'12px', color:t.textSecondary }}>{h.tip}</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>
                {h.googleJobsUrl && (
                  <button onClick={()=>window.open(h.googleJobsUrl,'_blank')} style={{ ...btnSecondary, padding:'9px 16px', fontSize:'12px' }}><Search size={13}/>{h.altLabel || 'Google Jobs'}</button>
                )}
                <button onClick={()=>window.open(searchUrl(h),'_blank')} style={{ ...btnPrimary, padding:'9px 18px', fontSize:'13px' }}><Search size={14}/>Search Now</button>
              </div>
            </div>
            <div style={{ background:t.codeBg, padding:'12px 16px', borderRadius:'10px', fontFamily:'SF Mono,Monaco,Consolas,monospace', fontSize:'11.5px', color:t.codeColor, overflowX:'auto', whiteSpace:'nowrap' }}>
              {h.query}{filterLabel(h) && <span style={{ color:t.textTertiary }}> [{filterLabel(h)}]</span>}
            </div>
            <button onClick={()=>copyToClipboard(h.query, h.id+'-copy')} style={{ ...btnSecondary, marginTop:'10px', padding:'7px 14px', fontSize:'12px' }}>
              {copiedId===h.id+'-copy'?<><Check size={12}/> Copied!</>:<><Copy size={12}/> Copy query</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
