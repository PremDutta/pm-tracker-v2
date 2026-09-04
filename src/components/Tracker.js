import React, { useState } from 'react';
import { Plus, Trash2, Briefcase } from 'lucide-react';
import { getApplications, addApplication, updateApplication, deleteApplication, APPLICATION_STATUSES } from '../storage';

const STATUS_COLORS = {
  Applied: '#0A84FF', Screening: '#FFD60A', Interview: '#FF9500', Offer: '#30D158', Rejected: '#FF453A',
};

export default function Tracker({ t, card, btnPrimary, btnSecondary }) {
  const [apps, setApps] = useState(getApplications());
  const [form, setForm] = useState({ company: '', role: '', platform: '', link: '' });

  const inputStyle = { padding: '10px 12px', borderRadius: '10px', border: `1px solid ${t.border}`, background: t.inlineBg, color: t.text, fontSize: '13px' };

  const submit = (e) => {
    e.preventDefault();
    if (!form.company.trim()) return;
    setApps(addApplication(form));
    setForm({ company: '', role: '', platform: '', link: '' });
  };

  const changeStatus = (id, status) => setApps(updateApplication(id, { status }));
  const remove = (id) => setApps(deleteApplication(id));

  const grouped = APPLICATION_STATUSES.map(status => ({ status, items: apps.filter(a => a.status === status) }));

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '34px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '10px' }}>Application Tracker</h2>
        <p style={{ fontSize: '16px', color: t.textSecondary, maxWidth: '520px', margin: '0 auto' }}>The thing the rest of this app can't do for you — a record of where you actually stand. Saved on this device only.</p>
      </div>

      <form onSubmit={submit} style={{ ...card, marginBottom: '28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '10px', alignItems: 'end' }}>
        <div>
          <input style={inputStyle} placeholder="Company *" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} required />
        </div>
        <div>
          <input style={inputStyle} placeholder="Role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
        </div>
        <div>
          <input style={inputStyle} placeholder="Platform (Naukri, referral...)" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} />
        </div>
        <div>
          <input style={inputStyle} placeholder="Job link (optional)" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} />
        </div>
        <button type="submit" style={{ ...btnPrimary, padding: '10px 16px', fontSize: '13px', justifySelf: 'start' }}><Plus size={14} /> Add</button>
      </form>

      {apps.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px', color: t.textSecondary }}>
          <Briefcase size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p>Nothing tracked yet. Add the jobs you apply to above — this is what turns "I applied somewhere" into "here's exactly where I stand with 12 companies."</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: '14px' }}>
          {grouped.map(({ status, items }) => (
            <div key={status}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLORS[status] }} />
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: t.textSecondary }}>{status}</h3>
                <span style={{ fontSize: '12px', color: t.textTertiary }}>{items.length}</span>
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {items.map(a => (
                  <div key={a.id} style={{ ...card, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>{a.company}</div>
                        {a.role && <div style={{ fontSize: '12px', color: t.textSecondary }}>{a.role}</div>}
                        {a.platform && <div style={{ fontSize: '11px', color: t.textTertiary, marginTop: '2px' }}>via {a.platform}</div>}
                        <div style={{ fontSize: '10px', color: t.textTertiary, marginTop: '4px' }}>{a.appliedDate}</div>
                      </div>
                      <button onClick={() => remove(a.id)} style={{ background: 'none', border: 'none', color: t.textTertiary, cursor: 'pointer', padding: '2px', flexShrink: 0 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <select value={a.status} onChange={e => changeStatus(a.id, e.target.value)} style={{ ...inputStyle, width: '100%', marginTop: '10px', padding: '6px 10px', fontSize: '12px' }}>
                      {APPLICATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {a.link && <a href={a.link} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, marginTop: '8px', padding: '6px 12px', fontSize: '11px', width: '100%', justifyContent: 'center' }}>Open listing</a>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
