import React, { useState, useEffect } from 'react';
import { GOOGLE_HACKS, HACK_CATEGORIES } from '../data/googleHacks';
import { fillRole } from '../data/roles';
import NewBadge from '../components/NewBadge';
import HackCard from '../components/HackCard';

export default function HacksTab({ t, theme, card, btnPrimary, btnSecondary, badge, isLoaded, role, focus }) {
  const [hackCategory, setHackCategory] = useState(focus?.hackCategory || 'all');
  // "Go to feature" from the announcements opens a specific category.
  useEffect(() => { if (focus?.hackCategory) setHackCategory(focus.hackCategory); }, [focus?.nonce, focus?.hackCategory]);

  const hacks = GOOGLE_HACKS.map(h => ({ ...h, query: fillRole(h.query, role), googleJobsUrl: fillRole(h.googleJobsUrl, role) }));
  const filteredHacks = hackCategory === 'all' ? hacks : hacks.filter(h => h.category === hackCategory);


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
        {filteredHacks.map((h,i) => <HackCard key={h.id} h={h} i={i} t={t} theme={theme} card={card} btnPrimary={btnPrimary} btnSecondary={btnSecondary} badge={badge} isLoaded={isLoaded} />)}
      </div>
    </div>
  );
}
