import React, { useState } from 'react';
import { Search, Copy, Check } from 'lucide-react';
import NewBadge from './NewBadge';

// Google URL for a hack: timeFilter = past 24h (older cards), tbs = any Google
// time filter (qdr:w / qdr:m), news = search Google News instead of the web.
export const searchUrl = (h) => 'https://www.google.com/search?q=' + encodeURIComponent(h.query) +
  (h.tbs ? `&tbs=${h.tbs}` : h.timeFilter ? '&tbs=qdr:d' : '') + (h.news ? '&tbm=nws' : '');
const TIME_LABELS = { 'qdr:d': 'Past 24 hours', 'qdr:w': 'Past week', 'qdr:m': 'Past month' };
const filterLabel = (h) => [TIME_LABELS[h.tbs || (h.timeFilter ? 'qdr:d' : '')], h.news && 'Google News'].filter(Boolean).join(' · ');

/** One Google-search hack: title, tip, the query, Search Now / Copy. Shared by
 *  the Hacks and AI PM tabs. `h.query` is already role-filled. */
export default function HackCard({ h, i = 0, t, theme, card, btnPrimary, btnSecondary, badge, isLoaded = true }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(h.query).catch(() => {}).finally(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <div style={{ ...card, minWidth:0, opacity:isLoaded?1:0, transform:isLoaded?'translateY(0)':'translateY(10px)', transition:`all 0.4s ease ${i*0.04}s` }}>
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
      <button onClick={copy} style={{ ...btnSecondary, marginTop:'10px', padding:'7px 14px', fontSize:'12px' }}>
        {copied?<><Check size={12}/> Copied!</>:<><Copy size={12}/> Copy query</>}
      </button>
    </div>
  );
}
