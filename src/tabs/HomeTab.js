import React, { useState } from 'react';
import { Briefcase, Lightbulb, MapPin, Bell, MessageSquare, Globe, Zap, ArrowRight, Award, Sparkles } from 'lucide-react';
import { GOOGLE_HACKS } from '../data/googleHacks';
import { recentFeatures } from '../data/whatsNew';
import NewBadge from '../components/NewBadge';

const STATS = [
  { n:'28+', label:'Job Platforms', icon: Briefcase, gradientKey:'gradient1' },
  { n:String(GOOGLE_HACKS.length), label:'Search Hacks', icon: Lightbulb, gradientKey:'gradient5' },
  { n:'12',  label:'Indian Cities', icon: MapPin,     gradientKey:'gradient4' },
  { n:'6',   label:'Alert Systems', icon: Bell,        gradientKey:'gradient3' },
  { n:'10+', label:'Templates',     icon: MessageSquare, gradientKey:'gradient2' },
  { n:'4',   label:'Countries',     icon: Globe, gradient:'linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)' },
];

const FEATURES = [
  { title:'Top Companies', desc:'MNCs, IT majors, big tech and Indian unicorns: careers pages plus live open product roles in India.', icon:'🏢', tab:'companies', gradientKey:'gradient1' },
  { title:'Hiring Signals', desc:'Reposted PM roles, engineering spikes and fresh funding: spot roles before they are posted.', icon:'🔭', tab:'signals', gradientKey:'gradient5' },
  { title:'Govt & PSU Jobs', desc:'Live product roles at NPCI, RBIH, NeGD, PSU banks and 130+ PSUs, auto-scanned every 6 hours.', icon:'🏛️', tab:'govt', gradientKey:'gradient3' },
  { title:'Application Tracker', desc:'Track every application through Applied, Screening, Interview, Offer.', icon:'📋', tab:'tracker', gradientKey:'gradient2' },
  { title:'Target Company Watchlist', desc:'Track specific companies with recruiter search + auto-drafted outreach.', icon:'🏢', tab:'watchlist', gradientKey:'gradient4' },
  { title:'Resume ↔ JD Match',  desc:'Paste a resume and JD, see missing keywords instantly.', icon:'📄', tab:'resumematch', gradientKey:'gradient3' },
  { title:'All Job Platforms', desc:'28 boards — Indian, global, remote, startup. Sorted newest first.', icon:'💼', tab:'jobs', gradientKey:'gradient1' },
  { title:'Google Hacks',       desc:`${GOOGLE_HACKS.length} queries to find unlisted jobs, hidden posts and hiring signals before boards do.`, icon:'🔍', tab:'hacks', gradientKey:'gradient5' },
  { title:'Alert Setup',        desc:'Set up 6 real-time alert systems so new jobs reach YOU first.', icon:'🔔', tab:'alerts', gradientKey:'gradient3' },
  { title:'Be First to Apply',  desc:'Step-by-step strategy to be in the top 5 applicants every time.', icon:'⚡', tab:'firstapply', gradientKey:'gradient2' },
  { title:'Remote & International', desc:'Remote boards, IST-friendly companies, US/UK/Canada/Singapore.', icon:'🌍', tab:'remote', gradientKey:'gradient4' },
  { title:'LinkedIn Templates', desc:'Copy-paste messages for connections, referrals, cold outreach.', icon:'💬', tab:'templates', gradient:'linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)' },
];

export default function HomeTab({
  t, card, btnPrimary, btnSecondary, badge, isLoaded,
  setActiveTab, setSelectedRegion,
  selectedRole, selectedLocation, selectedFreshness, selectedExperience,
  openMultiple, getQuickLaunchUrls, isOpening,
}) {
  const filterOpts = { freshness: selectedFreshness, experience: selectedExperience };
  const [showAllNew, setShowAllNew] = useState(false);
  const news = recentFeatures();

  const openAllIndia = () => {
    openMultiple(getQuickLaunchUrls('india', selectedRole, selectedLocation, filterOpts));
    setSelectedRegion('india');
    setActiveTab('jobs');
  };

  return (
    <div style={{ opacity:isLoaded?1:0, transform:isLoaded?'translateY(0)':'translateY(20px)', transition:'all 0.8s cubic-bezier(0.25,0.1,0.25,1)' }}>
      <section style={{ textAlign:'center', padding:'60px 0 72px' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'7px 16px', background:t.name==='dark'?'rgba(48,209,88,0.15)':'rgba(52,199,89,0.1)', borderRadius:'980px', marginBottom:'24px' }}>
          <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:t.success, animation:'pulse 2s infinite' }}/>
          <span style={{ fontSize:'13px', color:t.success, fontWeight:'600' }}>Live • 28 platforms connected</span>
        </div>
        <h1 style={{ fontSize:'clamp(44px,10vw,80px)', fontWeight:'700', letterSpacing:'-0.04em', lineHeight:'1.05', margin:'0 0 24px', color:t.text }}>
          Find every PM job.<br/><span style={{ background:t.gradient3, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Apply first. Win.</span>
        </h1>
        <p style={{ fontSize:'20px', color:t.textSecondary, lineHeight:'1.6', maxWidth:'580px', margin:'0 auto 40px', fontWeight:'400' }}>
          28 platforms • Application tracker • Company watchlist •<br/>Resume match. Everything to land your next PM role.
        </p>
        <div style={{ display:'flex', gap:'14px', justifyContent:'center', flexWrap:'wrap' }}>
          <button onClick={openAllIndia} style={btnPrimary}><Zap size={18}/>{isOpening?'Opening…':'Open All India Platforms'}<ArrowRight size={16}/></button>
          <button onClick={()=>setActiveTab('hacks')} style={btnSecondary}><Lightbulb size={16}/>Unlock Hacks</button>
        </div>
      </section>

      {/* What's new */}
      {news.length > 0 && (
        <section style={{ ...card, marginBottom:'40px' }}>
          <h2 style={{ margin:'0 0 14px', fontSize:'18px', fontWeight:'600', display:'flex', alignItems:'center', gap:'8px' }}><Sparkles size={18} style={{ color:t.success }}/> What's new</h2>
          <div style={{ display:'grid', gap:'8px' }}>
            {(showAllNew ? news : news.slice(0, 5)).map(f => (
              <button key={f.id} onClick={()=>setActiveTab(f.tab)} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', background:t.inlineBg, border:'none', borderRadius:'12px', color:t.text, cursor:'pointer', textAlign:'left', flexWrap:'wrap' }}>
                <NewBadge id={f.id} t={t} />
                <span style={{ fontSize:'14px', fontWeight:'600' }}>{f.title}</span>
                {f.desc && <span style={{ fontSize:'12px', color:t.textSecondary, flex:'1 1 240px' }}>{f.desc}</span>}
                <span style={{ fontSize:'11px', color:t.textTertiary, marginLeft:'auto' }}>{f.date}</span>
              </button>
            ))}
          </div>
          {news.length > 5 && (
            <button onClick={()=>setShowAllNew(v=>!v)} style={{ ...btnSecondary, marginTop:'10px', padding:'7px 14px', fontSize:'12px' }}>
              {showAllNew ? 'Show less' : `Show all ${news.length} updates`}
            </button>
          )}
        </section>
      )}

      {/* Stats */}
      <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'16px', marginBottom:'72px' }}>
        {STATS.map((s,i) => {
          const Icon = s.icon;
          return (
          <div key={i} style={{ ...card, textAlign:'center', padding:'28px 20px', opacity:isLoaded?1:0, transform:isLoaded?'translateY(0)':'translateY(20px)', transition:`all 0.6s cubic-bezier(0.25,0.1,0.25,1) ${i*0.08}s` }}>
            <div style={{ width:'50px', height:'50px', borderRadius:'14px', background:s.gradient || t[s.gradientKey], display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', color:'#fff' }}><Icon size={22}/></div>
            <div style={{ fontSize:'32px', fontWeight:'700', letterSpacing:'-0.02em', marginBottom:'4px' }}>{s.n}</div>
            <div style={{ fontSize:'13px', color:t.textSecondary }}>{s.label}</div>
          </div>
        );})}
      </section>

      {/* Feature cards */}
      <section style={{ marginBottom:'72px' }}>
        <h2 style={{ fontSize:'30px', fontWeight:'700', letterSpacing:'-0.02em', textAlign:'center', marginBottom:'40px' }}>Your complete PM job toolkit</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'20px' }}>
          {FEATURES.map((f,i) => (
            <button key={i} onClick={()=>setActiveTab(f.tab)} style={{ ...card, textAlign:'left', cursor:'pointer', opacity:isLoaded?1:0, transform:isLoaded?'translateY(0)':'translateY(20px)', transition:`all 0.6s cubic-bezier(0.25,0.1,0.25,1) ${i*0.08+0.2}s` }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
                <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:f.gradient || t[f.gradientKey], display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px' }}>{f.icon}</div>
                <NewBadge id={`tab:${f.tab}`} t={t} style={{ fontSize:'10px', padding:'3px 9px' }} />
              </div>
              <h3 style={{ margin:'0 0 8px', fontSize:'18px', fontWeight:'600' }}>{f.title}</h3>
              <p style={{ margin:'0 0 16px', fontSize:'14px', color:t.textSecondary, lineHeight:'1.6' }}>{f.desc}</p>
              <div style={{ color:t.accent, fontSize:'13px', fontWeight:'500', display:'flex', alignItems:'center', gap:'4px' }}>Explore <ArrowRight size={13}/></div>
            </button>
          ))}
        </div>
      </section>

      {/* Pro tip */}
      <div style={{ ...card, background:t.name==='dark'?'linear-gradient(135deg,rgba(255,214,10,0.1) 0%,rgba(255,149,0,0.1) 100%)':'linear-gradient(135deg,rgba(255,214,10,0.08) 0%,rgba(255,149,0,0.08) 100%)', padding:'36px', textAlign:'center' }}>
        <Award size={36} style={{ color:t.warning, marginBottom:'12px' }}/>
        <h3 style={{ margin:'0 0 10px', fontSize:'22px', fontWeight:'600' }}>The #1 Proven Tactic</h3>
        <p style={{ margin:'0 auto 24px', fontSize:'17px', color:t.textSecondary, maxWidth:'500px', lineHeight:'1.6' }}>Applying in the <strong style={{ color:t.text }}>first 10 applicants</strong> makes you <strong style={{ color:t.text }}>4x more likely</strong> to hear back. Set alerts → apply same hour → chase referral.</p>
        <button onClick={()=>setActiveTab('firstapply')} style={btnPrimary}><Zap size={16}/>See the "Be First" Strategy</button>
      </div>
    </div>
  );
}
