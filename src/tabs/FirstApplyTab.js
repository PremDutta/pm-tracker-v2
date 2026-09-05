import React from 'react';
import { FIRST_APPLY } from '../data/firstApply';

const CHECKLIST = [
  'Set LinkedIn job alert → "As it happens" (not daily)',
  'Set Naukri job alert with same role & city filters',
  'Create Google Alert: "product manager" "we are hiring" india',
  'Enable push notifications on LinkedIn + Naukri mobile apps',
  'Prepare 2 resume versions: startup-focused & enterprise-focused',
  'Draft 1 cover email template — personalize just the first 2 lines fast',
  'Write a shortlist of 20 target companies — check their careers pages weekly',
  'Connect with 5 PMs at your target companies on LinkedIn this week',
];

export default function FirstApplyTab({ t, card }) {
  return (
    <div>
      <div style={{ textAlign:'center', marginBottom:'40px' }}>
        <h2 style={{ fontSize:'34px', fontWeight:'700', letterSpacing:'-0.02em', marginBottom:'10px' }}>Be First to Apply</h2>
        <p style={{ fontSize:'16px', color:t.textSecondary, maxWidth:'520px', margin:'0 auto' }}>A systematic 6-step approach to consistently be in the top 5 applicants — where your resume actually gets read.</p>
      </div>

      <div style={{ display:'grid', gap:'14px', marginBottom:'48px' }}>
        {FIRST_APPLY.map((s,i) => (
          <div key={i} style={{ ...card, display:'flex', alignItems:'flex-start', gap:'20px' }}>
            <div style={{ width:'44px', height:'44px', borderRadius:'14px', background:t.gradient1, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'18px', fontWeight:'700', color:'#fff' }}>{s.step}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
                <span style={{ fontSize:'20px' }}>{s.icon}</span>
                <h3 style={{ margin:0, fontSize:'16px', fontWeight:'600' }}>{s.title}</h3>
              </div>
              <p style={{ margin:0, fontSize:'14px', color:t.textSecondary, lineHeight:'1.6' }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...card, padding:'32px' }}>
        <h3 style={{ margin:'0 0 20px', fontSize:'18px', fontWeight:'600' }}>⚡ Today's Action Checklist</h3>
        <div style={{ display:'grid', gap:'10px' }}>
          {CHECKLIST.map((item,i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'12px', padding:'12px 16px', background:t.inlineBg, borderRadius:'12px', border:`1px solid ${t.border}` }}>
              <div style={{ width:'22px', height:'22px', borderRadius:'6px', border:`2px solid ${t.border}`, flexShrink:0, marginTop:'1px' }}/>
              <span style={{ fontSize:'14px', lineHeight:'1.5' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
