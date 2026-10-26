import React from 'react';
import { INDIA_CITIES, ABROAD } from '../data/location';

/** India: multi-select cities. Abroad: one region. Drives {LOC} in search hacks. */
export default function LocationPicker({ t, loc, onChange }) {
  const chip = (on) => ({ padding:'6px 12px', borderRadius:'980px', border:`1px solid ${on ? t.accent : t.border}`, background:on ? t.accent : t.cardBg, color:on ? '#fff' : t.textSecondary, fontSize:'12px', cursor:'pointer', whiteSpace:'nowrap' });
  const toggleCity = (id) => {
    const has = loc.cities.includes(id);
    const cities = has ? loc.cities.filter(c => c !== id) : [...loc.cities, id];
    onChange({ ...loc, mode: 'india', cities: cities.length ? cities : [id] });
  };
  return (
    <div id="hack-location" style={{ padding:'14px 16px', border:`1px solid ${t.border}`, borderRadius:'16px', background:t.cardBg, marginBottom:'20px', scrollMarginTop:'140px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px', flexWrap:'wrap' }}>
        <span style={{ fontSize:'13px', fontWeight:600 }}>📍 Search location</span>
        <button onClick={() => onChange({ ...loc, mode: 'india' })} aria-pressed={loc.mode === 'india'} style={chip(loc.mode === 'india')}>🇮🇳 India</button>
        <button onClick={() => onChange({ ...loc, mode: 'abroad' })} aria-pressed={loc.mode === 'abroad'} style={chip(loc.mode === 'abroad')}>🌍 Abroad</button>
        <span style={{ fontSize:'11px', color:t.textTertiary }}>{loc.mode === 'india' ? 'Pick one or more cities' : 'Pick a region'}</span>
      </div>
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
        {loc.mode === 'india'
          ? INDIA_CITIES.map(c => <button key={c.id} onClick={() => toggleCity(c.id)} aria-pressed={loc.cities.includes(c.id)} aria-label={`City: ${c.label}`} style={chip(loc.cities.includes(c.id))}>{c.label}</button>)
          : ABROAD.map(r => <button key={r.id} onClick={() => onChange({ ...loc, region: r.id })} aria-pressed={loc.region === r.id} aria-label={`Region: ${r.label}`} style={chip(loc.region === r.id)}>{r.label}</button>)}
      </div>
    </div>
  );
}
