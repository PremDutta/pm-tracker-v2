import React from 'react';
import { Bell, ExternalLink, Star } from 'lucide-react';
import { ALERT_TIPS } from '../data/alertTips';

export default function AlertsTab({ t, theme, card, btnPrimary }) {
  return (
    <div>
      <div style={{ textAlign:'center', marginBottom:'40px' }}>
        <h2 style={{ fontSize:'34px', fontWeight:'700', letterSpacing:'-0.02em', marginBottom:'10px' }}>Job Alert Systems</h2>
        <p style={{ fontSize:'16px', color:t.textSecondary, maxWidth:'520px', margin:'0 auto' }}>Set up these 6 alert channels so new PM jobs come to you — be in the first 10 applicants automatically.</p>
      </div>
      <div style={{ display:'grid', gap:'14px', marginBottom:'48px' }}>
        {ALERT_TIPS.map((a,i) => (
          <div key={i} style={{ ...card, display:'flex', alignItems:'flex-start', gap:'20px', flexWrap:'wrap' }}>
            <span style={{ fontSize:'32px', flexShrink:0 }}>{a.icon}</span>
            <div style={{ flex:1, minWidth:'200px' }}>
              <h3 style={{ margin:'0 0 4px', fontSize:'16px', fontWeight:'600' }}>{a.title}</h3>
              <p style={{ margin:'0 0 8px', fontSize:'14px', color:t.textSecondary }}>{a.desc}</p>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', background:theme==='dark'?'rgba(48,209,88,0.1)':'rgba(52,199,89,0.08)', borderRadius:'8px', fontSize:'12px', color:t.success, marginBottom:'12px', width:'fit-content' }}>
                <Star size={11}/> {a.tip}
              </div>
            </div>
            <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ ...btnPrimary, padding:'10px 20px', fontSize:'13px', flexShrink:0 }}>Set Up <ExternalLink size={13}/></a>
          </div>
        ))}
      </div>

      <div style={{ ...card, background:theme==='dark'?'linear-gradient(135deg,rgba(10,132,255,0.1) 0%,rgba(102,126,234,0.1) 100%)':'linear-gradient(135deg,rgba(0,113,227,0.06) 0%,rgba(102,126,234,0.06) 100%)', padding:'32px', textAlign:'center' }}>
        <Bell size={32} style={{ color:t.accent, marginBottom:'12px' }}/>
        <h3 style={{ margin:'0 0 10px', fontSize:'20px', fontWeight:'600' }}>Pro tip: Stack your alerts</h3>
        <p style={{ margin:'0 auto', fontSize:'16px', color:t.textSecondary, maxWidth:'480px', lineHeight:'1.6' }}>Set up <strong style={{ color:t.text }}>all 6 alert systems</strong> independently. Each surface different jobs — you'll catch listings others miss entirely.</p>
      </div>
    </div>
  );
}
