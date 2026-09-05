import React from 'react';
import { ExternalLink } from 'lucide-react';
import { REMOTE_STRATEGIES } from '../data/strategies';

export default function RemoteTab({ t, card, btnSecondary }) {
  return (
    <div>
      <div style={{ textAlign:'center', marginBottom:'40px' }}>
        <h2 style={{ fontSize:'34px', fontWeight:'700', letterSpacing:'-0.02em', marginBottom:'10px' }}>Remote & International</h2>
        <p style={{ fontSize:'16px', color:t.textSecondary }}>Work from India for global companies — full-time remote, not just contract</p>
      </div>
      {REMOTE_STRATEGIES.map((section,i) => (
        <div key={i} style={{ ...card, marginBottom:'20px' }}>
          <h3 style={{ margin:'0 0 18px', fontSize:'17px', fontWeight:'600', display:'flex', alignItems:'center', gap:'10px' }}><span style={{ fontSize:'22px' }}>{section.icon}</span>{section.title}</h3>
          <div style={{ display:'grid', gap:'8px' }}>
            {section.items.map((item,j) => (
              <div key={j} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:t.inlineBg, borderRadius:'12px', gap:'12px', flexWrap:'wrap' }}>
                <span style={{ fontSize:'14px' }}>{item.name}{item.tip && <span style={{ color:t.textSecondary }}> — {item.tip}</span>}</span>
                {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, padding:'7px 14px', fontSize:'12px' }}>Open <ExternalLink size={11}/></a>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
