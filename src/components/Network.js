import React, { useState } from 'react';
import { Users, Check } from 'lucide-react';
import { getNetwork, setNetwork, parseNetwork, contactsAt } from '../storage';
import NewBadge from './NewBadge';

// "You know someone here" flag, shown on Watchlist cards, Tracker entries and
// govt openings. Renders nothing when there's no match.
export function ContactFlag({ company, t, network }) {
  const people = contactsAt(company, network);
  if (people.length === 0) return null;
  const label = people.map(p => p.note ? `${p.name} (${p.note})` : p.name).join(', ');
  return (
    <div title="Ask them for a referral before you apply: referred candidates are hired far more often" style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', color:t.success, fontWeight:'600', marginTop:'4px' }}>
      <Users size={11} /> You know {label}
    </div>
  );
}

// One line per person. Saved on this device only, like the rest of the app.
export function NetworkEditor({ t, card, btnPrimary, onChange }) {
  const toText = (people) => people.map(p => [p.name, p.company, p.note].filter(Boolean).join(', ')).join('\n');
  const [text, setText] = useState(() => toText(getNetwork()));
  const [saved, setSaved] = useState(false);
  const save = () => {
    const people = parseNetwork(text);
    setNetwork(people);
    onChange?.(people);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  return (
    <div style={{ ...card, marginBottom: '28px' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Users size={16} /> My network <NewBadge id="network:matcher" t={t} />
      </h3>
      <p style={{ margin: '0 0 12px', fontSize: '12px', color: t.textSecondary }}>
        Ex-colleagues and friends, one per line: <code style={{ color: t.codeColor }}>Name, Company, how you know them</code>. Any watchlist company, tracked application or govt opening where you know someone gets flagged, so you ask for a referral first. Saved on this device only.
      </p>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={4} aria-label="My network"
        placeholder={'Asha Rao, Razorpay, ex-Aftershoot\nVikram S, NPCI, Zee Trinetra team'}
        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${t.border}`, background: t.inlineBg, color: t.text, fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }} />
      <button onClick={save} style={{ ...btnPrimary, marginTop: '10px', padding: '9px 18px', fontSize: '13px', background: saved ? t.success : t.accent }}>
        {saved ? <><Check size={14} /> Saved</> : 'Save network'}
      </button>
    </div>
  );
}
