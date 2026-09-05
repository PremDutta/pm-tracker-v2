import React, { useState } from 'react';
import { Users, Star, Clock, Mail, ChevronUp, ChevronDown, Check, Copy } from 'lucide-react';
import ProfileEditor from '../components/ProfileEditor';
import { MESSAGE_TEMPLATES } from '../data/messageTemplates';

const CATEGORY_ICON = { connectionRequest: Users, referralRequest: Star, followUp: Clock, coldOutreach: Mail };

// Fills the constant parts of a template from the saved profile —
// recipient-specific brackets ([Name], [Company]) are left for you to fill,
// since those shouldn't be templated verbatim.
function fillTemplate(message, profile) {
  if (!profile) return message;
  let out = message;
  if (profile.years) {
    out = out.replace(/\[X\] years/g, `${profile.years} years`);
    out = out.replace(/\[X years\]/g, `${profile.years}-year`);
  }
  if (profile.domain) {
    out = out.replace(/\[domain\]/g, profile.domain);
    out = out.replace(/\[Domain expertise\]/g, `${profile.domain} expertise`);
  }
  const achievements = (profile.achievements || []).filter(Boolean);
  if (achievements[0]) {
    out = out.replace(/\[Achievement 1 with metric, e\.g\. "Grew DAU 40% in Q2"\]/g, achievements[0]);
    out = out.replace(/\[Achievement 1 — quantified\]/g, achievements[0]);
  }
  if (achievements[1]) {
    out = out.replace(/\[Achievement 2 with metric\]/g, achievements[1]);
    out = out.replace(/\[Achievement 2 — quantified\]/g, achievements[1]);
  }
  return out;
}

export default function TemplatesTab({ t, card, btnPrimary, profile, onProfileChange }) {
  const [expandedSections, setExpandedSections] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const toggleSection = (id) => setExpandedSections(p => ({ ...p, [id]: !p[id] }));

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).catch(() => {}).finally(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div>
      <div style={{ textAlign:'center', marginBottom:'40px' }}>
        <h2 style={{ fontSize:'34px', fontWeight:'700', letterSpacing:'-0.02em', marginBottom:'10px' }}>LinkedIn Templates</h2>
        <p style={{ fontSize:'16px', color:t.textSecondary }}>Copy-paste messages — customize the [brackets], send in seconds</p>
      </div>
      <ProfileEditor t={t} card={card} btnPrimary={btnPrimary} profile={profile} onChange={onProfileChange} />
      {Object.entries(MESSAGE_TEMPLATES).map(([cat,temps]) => {
        const CategoryIcon = CATEGORY_ICON[cat];
        return (
        <div key={cat} style={{ marginBottom:'16px' }}>
          <button onClick={()=>toggleSection(cat)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 22px', background:t.cardBg, border:`1px solid ${t.border}`, borderRadius:expandedSections[cat]?'16px 16px 0 0':'16px', color:t.text, cursor:'pointer', fontSize:'15px', fontWeight:'600', transition:'all 0.2s ease' }}>
            <span style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <CategoryIcon size={18}/>
              {cat.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase())}
              <span style={{ padding:'3px 9px', background:t.accent, borderRadius:'10px', fontSize:'11px', color:'#fff' }}>{temps.length}</span>
            </span>
            {expandedSections[cat]?<ChevronUp size={18}/>:<ChevronDown size={18}/>}
          </button>
          {expandedSections[cat] && (
            <div style={{ border:`1px solid ${t.border}`, borderTop:'none', borderRadius:'0 0 16px 16px', overflow:'hidden' }}>
              {temps.map((tmpl,i) => (
                <div key={tmpl.id} style={{ padding:'22px', borderBottom:i<temps.length-1?`1px solid ${t.border}`:'none', background:t.templateBg, color:t.text }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px', flexWrap:'wrap', gap:'10px' }}>
                    <div>
                      <h4 style={{ margin:'0 0 3px', fontSize:'15px', fontWeight:'600' }}>{tmpl.title}</h4>
                      <p style={{ margin:0, fontSize:'12px', color:t.textSecondary }}>{tmpl.context}</p>
                    </div>
                    <button onClick={()=>copyToClipboard(fillTemplate(tmpl.message, profile),tmpl.id)} style={{ ...btnPrimary, padding:'9px 16px', fontSize:'13px', background:copiedId===tmpl.id?t.success:t.accent }}>
                      {copiedId===tmpl.id?<><Check size={14}/> Copied!</>:<><Copy size={14}/> Copy</>}
                    </button>
                  </div>
                  <div style={{ padding:'16px', background:t.codeBg, borderRadius:'12px', fontSize:'13px', lineHeight:'1.75', whiteSpace:'pre-wrap', color:t.text }}>{fillTemplate(tmpl.message, profile)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );})}
    </div>
  );
}
