import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import NewBadge from './NewBadge';

// Relocation routes for an India-based PM. Thresholds change yearly, so the
// guide says to check current numbers rather than quoting them.
const ROUTES = [
  ['🇦🇪 UAE', 'Employment visa (employer arranges)', 'Standard for almost every hire, so sponsorship barely counts against you. Answer "No, I\'ll need an employment visa" and move on. Check the Golden Visa once you have a senior offer.'],
  ['🇳🇱 Netherlands', 'Highly Skilled Migrant permit', 'Employer must be a recognised sponsor; the IND publishes the list. Only apply to companies on it.'],
  ['🇩🇪 Germany', 'EU Blue Card', 'Fast, with lower salary thresholds for IT and product roles.'],
  ['🇩🇪 Germany', 'Opportunity Card (Chancenkarte)', 'Points-based job-seeker visa: move and search for up to a year.'],
  ['🇬🇧 UK', 'Skilled Worker visa', 'The government publishes licensed sponsors. Check each company before applying.'],
  ['🇮🇪 Ireland', 'Critical Skills Employment Permit', 'Tech roles are on the shortage list.'],
];
const SPONSORS = [
  ['UAE AI', 'G42, Core42, Presight, AI71, TII (Falcon), MBZUAI, e&, Hub71 startups'],
  ['Dubai media & OTT', 'MBC Group / Shahid, OSN+, Anghami'],
  ['Gulf consumer tech', 'Careem, Talabat, Noon'],
  ['Netherlands', 'Booking.com, Adyen, Picnic, Mollie'],
  ['Germany', 'Delivery Hero, Zalando, N26, Celonis'],
  ['Sweden / UK / Estonia', 'Spotify, Klarna, Synthesia, Wise, Revolut, Bolt'],
];
const LINE = 'I will need sponsorship, and I qualify for the [EU Blue Card / Highly Skilled Migrant permit] at this salary level, so there is no labour market test. Processing usually takes a few weeks, and I can relocate within 30 days of approval.';

export default function VisaGuide({ t, card, btnSecondary }) {
  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard.writeText(LINE).catch(() => {}).finally(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  const box = { padding:'12px 14px', background:t.inlineBg, borderRadius:'12px', fontSize:'13px', lineHeight:1.5 };
  return (
    <div id="visa-guide" style={{ ...card, marginBottom:'24px', scrollMarginTop:'140px' }}>
      <h3 style={{ margin:'0 0 4px', fontSize:'17px', fontWeight:600, display:'flex', alignItems:'center', gap:'8px' }}>✈️ Relocation & visas <NewBadge id="intl:visa" t={t} /></h3>
      <p style={{ margin:'0 0 14px', fontSize:'12px', color:t.textSecondary }}>Salary thresholds change every year: check the current number for each country before you apply.</p>

      <div style={{ ...box, marginBottom:'12px', borderLeft:`3px solid ${t.warning}` }}>
        <strong>Portals often auto-reject "Yes, I need sponsorship."</strong> For jobs you really want, message the hiring manager or a recruiter on LinkedIn first: a person can make an exception, the filter can't. Add this to your note:
        <div style={{ display:'flex', gap:'8px', alignItems:'flex-start', marginTop:'8px' }}>
          <span style={{ flex:1, fontStyle:'italic' }}>"{LINE}"</span>
          <button onClick={copy} aria-label="Copy sponsorship line" style={{ ...btnSecondary, padding:'6px 10px', fontSize:'12px', flexShrink:0 }}>{copied ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy</>}</button>
        </div>
      </div>

      <div style={{ display:'grid', gap:'8px', marginBottom:'14px' }}>
        {ROUTES.map(([c, route, why]) => (
          <div key={c + route} style={{ ...box, display:'flex', gap:'10px', flexWrap:'wrap' }}>
            <span style={{ fontWeight:600, minWidth:'130px' }}>{c}</span>
            <span style={{ fontWeight:600, minWidth:'220px' }}>{route}</span>
            <span style={{ color:t.textSecondary, flex:'1 1 260px' }}>{why}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'6px' }}>Companies that commonly sponsor or relocate PMs</div>
      <div style={{ display:'grid', gap:'4px', fontSize:'12px', marginBottom:'12px' }}>
        {SPONSORS.map(([k, v]) => <div key={k}><strong>{k}:</strong> <span style={{ color:t.textSecondary }}>{v}</span></div>)}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:'8px' }}>
        <div style={box}><strong>Remote with European pay, no visa.</strong> ElevenLabs, GitLab, Deel and Remote hire in India through a local employer-of-record. Often the fastest route to European-level pay.</div>
        <div style={box}><strong>Internal transfer.</strong> Join a multinational's India office (Booking, Adobe, Amazon, Expedia, Microsoft) and move after ~12 months. The company handles the visa.</div>
      </div>
    </div>
  );
}
