import React, { useState } from 'react';
import { MapPin, ExternalLink, Rocket, ThumbsUp } from 'lucide-react';
import { PLATFORMS } from '../data/platforms';
import { INDIA_LOCATIONS } from '../data/locations';
import { FRESHNESS_OPTIONS, EXPERIENCE_LEVELS } from '../data/roles';
import { getPlatformMeta, markPlatformChecked, markPlatformUseful, timeAgo } from '../storage';

const REGIONS = [
  { id:'india', label:'🇮🇳 India', desc:'12 cities' },
  { id:'remote', label:'🌍 Remote', desc:'Work anywhere' },
  { id:'intl', label:'🌐 International', desc:'Global reach — see US/UK/CA/SG tab for per-country detail' },
];

export default function JobsTab({
  t, card, btnPrimary, badge,
  selectedRegion, setSelectedRegion,
  selectedRole,
  selectedLocation, setSelectedLocation,
  selectedFreshness, setSelectedFreshness,
  selectedExperience, setSelectedExperience,
  openMultiple, isOpening, getQuickLaunchUrls,
}) {
  // "Last checked" / "useful" tracking only matters on this tab, so it lives
  // here instead of in App.js.
  const [platformMeta, setPlatformMeta] = useState(() => getPlatformMeta());
  const trackPlatformClick = (platformId) => setPlatformMeta(markPlatformChecked(platformId));
  const trackPlatformUseful = (platformId, e) => { e.preventDefault(); e.stopPropagation(); setPlatformMeta(markPlatformUseful(platformId)); };

  const filterOpts = { freshness: selectedFreshness, experience: selectedExperience };

  const filteredPlatforms = Object.entries(PLATFORMS)
    .filter(([,p]) =>
      selectedRegion === 'india'  ? (p.region === 'india' || p.region === 'global') :
      selectedRegion === 'remote' ? (p.region === 'remote' || p.region === 'global') :
      selectedRegion === 'intl'   ? (p.region === 'us' || p.region === 'global') : true
    )
    .sort((a,b) => a[1].priority - b[1].priority);

  return (
    <div>
      <div style={{ display:'flex', gap:'10px', marginBottom:'28px', flexWrap:'wrap' }}>
        {REGIONS.map(r => (
          <button key={r.id} onClick={()=>setSelectedRegion(r.id)} style={{ padding:'18px 24px', background:selectedRegion===r.id?t.accent:t.cardBg, border:`1px solid ${selectedRegion===r.id?t.accent:t.border}`, borderRadius:'16px', color:selectedRegion===r.id?'#fff':t.text, cursor:'pointer', textAlign:'left', transition:'all 0.2s ease' }}>
            <div style={{ fontSize:'17px', fontWeight:'600', marginBottom:'3px' }}>{r.label}</div>
            <div style={{ fontSize:'12px', opacity:0.7 }}>{r.desc}</div>
          </button>
        ))}
      </div>

      {/* Quick Launch */}
      <div style={{ ...card, marginBottom:'28px', background:t.name==='dark'?'linear-gradient(135deg,rgba(10,132,255,0.12) 0%,rgba(102,126,234,0.12) 100%)':'linear-gradient(135deg,rgba(0,113,227,0.06) 0%,rgba(102,126,234,0.06) 100%)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'16px' }}>
          <div>
            <h3 style={{ margin:'0 0 4px', fontSize:'17px', fontWeight:'600' }}>⚡ Quick Launch</h3>
            <p style={{ margin:0, fontSize:'13px', color:t.textSecondary }}>Open top platforms for <strong>{selectedRole}</strong>{selectedRegion==='india'?<> in <strong>{selectedLocation}</strong></>:null} — newest first</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
            {selectedRegion==='india' && (
              <select value={selectedLocation} onChange={e=>setSelectedLocation(e.target.value)} style={{ padding:'10px 14px', borderRadius:'980px', border:`1px solid ${t.border}`, background:t.cardBg, color:t.text, fontSize:'13px', cursor:'pointer' }}>
                {INDIA_LOCATIONS.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
              </select>
            )}
            <button onClick={()=>openMultiple(getQuickLaunchUrls(selectedRegion, selectedRole, selectedLocation, filterOpts))} style={btnPrimary}><Rocket size={16}/>{isOpening?'Opening…':'Launch All'}</button>
          </div>
        </div>
      </div>

      {/* Filters — only LinkedIn / Naukri / Indeed honor these (see FRESHNESS_OPTIONS / EXPERIENCE_LEVELS comments); every other board has no documented equivalent param */}
      <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'20px' }}>
        <div>
          <div style={{ fontSize:'11px', color:t.textSecondary, marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Posted</div>
          <select value={selectedFreshness.id} onChange={e=>setSelectedFreshness(FRESHNESS_OPTIONS.find(f=>f.id===e.target.value))} style={{ padding:'9px 14px', borderRadius:'980px', border:`1px solid ${t.border}`, background:t.cardBg, color:t.text, fontSize:'13px', cursor:'pointer' }}>
            {FRESHNESS_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize:'11px', color:t.textSecondary, marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Experience</div>
          <select value={selectedExperience.id} onChange={e=>setSelectedExperience(EXPERIENCE_LEVELS.find(x=>x.id===e.target.value))} style={{ padding:'9px 14px', borderRadius:'980px', border:`1px solid ${t.border}`, background:t.cardBg, color:t.text, fontSize:'13px', cursor:'pointer' }}>
            {EXPERIENCE_LEVELS.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </div>
        <p style={{ alignSelf:'flex-end', fontSize:'11px', color:t.textTertiary, margin:'0 0 4px' }}>Applied on LinkedIn, Naukri &amp; Indeed only — other boards don't expose these as URL filters</p>
      </div>

      {/* Platform grid */}
      <h3 style={{ margin:'0 0 16px', fontSize:'18px', fontWeight:'600' }}>
        {selectedRegion==='india'?'🇮🇳 Indian & Global Platforms':selectedRegion==='remote'?'🌍 Remote Platforms':'🌐 International Platforms'}
        <span style={{ marginLeft:'10px', fontSize:'13px', color:t.textSecondary, fontWeight:'400' }}>{filteredPlatforms.length} platforms</span>
      </h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:'12px', marginBottom:'48px' }}>
        {filteredPlatforms.map(([id, p]) => {
          const meta = platformMeta[id] || {};
          return (
          <a key={id} href={p.getUrl(selectedRole, selectedRegion==='india'?selectedLocation:'', { ...filterOpts, region:selectedRegion })} target="_blank" rel="noopener noreferrer"
            onClick={()=>trackPlatformClick(id)}
            style={{ ...card, textDecoration:'none', color:t.text, display:'flex', alignItems:'center', gap:'14px', padding:'18px 20px' }}>
            <span style={{ fontSize:'28px', flexShrink:0 }}>{p.icon}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'3px' }}>
                <span style={{ fontSize:'15px', fontWeight:'600' }}>{p.name}</span>
                {p.badge && <span style={{ ...badge(t.badgeText, t.badgeBg), fontSize:'9px' }}>{p.badge}</span>}
              </div>
              <div style={{ fontSize:'12px', color:t.textSecondary, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.description}</div>
              <div style={{ fontSize:'10px', color:t.textTertiary, marginTop:'3px' }}>
                {meta.lastChecked ? `Checked ${timeAgo(meta.lastChecked)}` : 'Not checked yet'}
                {meta.usefulCount ? ` • 👍 ${meta.usefulCount}` : ''}
              </div>
            </div>
            <button onClick={(e)=>trackPlatformUseful(id,e)} title="Mark this platform as having gotten you a response" style={{ background:'none', border:`1px solid ${t.border}`, borderRadius:'8px', padding:'6px', color:t.textTertiary, cursor:'pointer', flexShrink:0 }}>
              <ThumbsUp size={13}/>
            </button>
            <ExternalLink size={15} style={{ color:t.textTertiary, flexShrink:0 }}/>
          </a>
        );})}
      </div>

      {/* City search */}
      {selectedRegion==='india' && (<>
        <h3 style={{ margin:'0 0 16px', fontSize:'18px', fontWeight:'600' }}>📍 Search by City on LinkedIn</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:'10px', marginBottom:'32px' }}>
          {INDIA_LOCATIONS.map(l => (
            <a key={l.id} href={PLATFORMS.linkedin.getUrl(selectedRole, l.name, { ...filterOpts, region:'india' })} target="_blank" rel="noopener noreferrer"
              style={{ ...card, textDecoration:'none', color:t.text, textAlign:'center', padding:'18px 14px' }}>
              <MapPin size={18} style={{ color:t.accent, marginBottom:'7px' }}/>
              <div style={{ fontSize:'14px', fontWeight:'500' }}>{l.name}</div>
            </a>
          ))}
        </div>

        <h3 style={{ margin:'0 0 16px', fontSize:'18px', fontWeight:'600' }}>🔵 Naukri by City</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:'10px' }}>
          {INDIA_LOCATIONS.map(l => (
            <a key={l.id} href={PLATFORMS.naukri.getUrl(selectedRole, l.name, { ...filterOpts, region:'india' })} target="_blank" rel="noopener noreferrer"
              style={{ ...card, textDecoration:'none', color:t.text, textAlign:'center', padding:'18px 14px', borderColor:'rgba(74,103,255,0.3)' }}>
              <span style={{ fontSize:'18px', display:'block', marginBottom:'7px' }}>🔵</span>
              <div style={{ fontSize:'14px', fontWeight:'500' }}>{l.name}</div>
            </a>
          ))}
        </div>
      </>)}
    </div>
  );
}
