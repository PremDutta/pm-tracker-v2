import React, { useState } from 'react';
import { User, Check } from 'lucide-react';
import { getProfile, setProfile } from '../storage';

// Saved once, reused everywhere a message needs "[X] years", "[domain]" or an
// achievement bullet filled in — the recipient-specific brackets ([Name],
// [Company], [specific feature]) are deliberately left for you to fill by
// hand each time, since those shouldn't be templated verbatim.
export default function ProfileEditor({ t, card, btnPrimary, profile, onChange }) {
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState(profile);

  const save = () => {
    setProfile(draft);
    onChange(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${t.border}`, background: t.inlineBg, color: t.text, fontSize: '13px' };
  const labelStyle = { fontSize: '11px', color: t.textSecondary, marginBottom: '5px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' };

  return (
    <div style={{ ...card, marginBottom: '24px' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}><User size={16} /> Your Profile</h3>
      <p style={{ margin: '0 0 16px', fontSize: '12px', color: t.textSecondary }}>Saved on this device only. Fills the constant parts of templates below — you still personalize [Name]/[Company] per message.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={labelStyle}>Your name</label>
          <input style={inputStyle} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Prem Dutta" />
        </div>
        <div>
          <label style={labelStyle}>Years of experience</label>
          <input style={inputStyle} value={draft.years} onChange={e => setDraft({ ...draft, years: e.target.value })} placeholder="8" />
        </div>
        <div>
          <label style={labelStyle}>Domain</label>
          <input style={inputStyle} value={draft.domain} onChange={e => setDraft({ ...draft, domain: e.target.value })} placeholder="video/streaming products" />
        </div>
      </div>
      <label style={labelStyle}>Achievement bullets (quantified — used in referral/cold-outreach templates)</label>
      <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
        {[0, 1, 2].map(i => (
          <input key={i} style={inputStyle} value={draft.achievements[i] || ''} placeholder={`e.g. "Grew DAU 40% in Q2 by shipping X"`}
            onChange={e => { const next = [...draft.achievements]; next[i] = e.target.value; setDraft({ ...draft, achievements: next }); }} />
        ))}
      </div>
      <button onClick={save} style={{ ...btnPrimary, padding: '9px 18px', fontSize: '13px', background: saved ? t.success : t.accent }}>
        {saved ? <><Check size={14} /> Saved</> : 'Save profile'}
      </button>
    </div>
  );
}
