import React from 'react';
import { ExternalLink, Star } from 'lucide-react';
import { INTL_STRATEGIES } from '../data/strategies';

export default function IntlTab({ t, card, btnSecondary }) {
  return (
    <div>
      <div style={{ textAlign:'center', marginBottom:'40px' }}>
        <h2 style={{ fontSize:'34px', fontWeight:'700', letterSpacing:'-0.02em', marginBottom:'10px' }}>US • UK • Canada • Singapore</h2>
        <p style={{ fontSize:'16px', color:t.textSecondary }}>Strategies + sponsor-friendly companies for international PM roles</p>
      </div>
      {Object.entries(INTL_STRATEGIES).map(([key,data]) => (
        <div key={key} style={{ ...card, marginBottom:'20px' }}>
          <h3 style={{ margin:'0 0 20px', fontSize:'20px', fontWeight:'600' }}>{data.title}</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:'20px' }}>
            <div>
              <h4 style={{ margin:'0 0 12px', fontSize:'12px', color:t.textSecondary, textTransform:'uppercase', letterSpacing:'0.5px' }}>Platforms</h4>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {data.platforms.map((p,i) => <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, justifyContent:'flex-start', fontSize:'13px' }}>{p.name} <ExternalLink size={12}/></a>)}
              </div>
            </div>
            <div>
              <h4 style={{ margin:'0 0 12px', fontSize:'12px', color:t.textSecondary, textTransform:'uppercase', letterSpacing:'0.5px' }}>Tips</h4>
              <div style={{ display:'grid', gap:'7px' }}>
                {data.tips.map((tip,i) => <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'8px', fontSize:'13px' }}><Star size={12} style={{ color:t.warning, marginTop:'2px', flexShrink:0 }}/>{tip}</div>)}
              </div>
            </div>
            <div>
              <h4 style={{ margin:'0 0 12px', fontSize:'12px', color:t.textSecondary, textTransform:'uppercase', letterSpacing:'0.5px' }}>Sponsor-Friendly</h4>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                {data.sponsors.map((c,i) => <span key={i} style={{ padding:'5px 10px', background:t.inlineBg, border:`1px solid ${t.border}`, borderRadius:'8px', fontSize:'12px', color:t.text }}>{c}</span>)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
