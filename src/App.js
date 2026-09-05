import React, { useState, useEffect } from 'react';
import { Zap, Globe, Briefcase, Target, Lightbulb, MessageSquare, Sun, Moon, Sparkles, Bell, ClipboardList, Building2, FileSearch } from 'lucide-react';
import { getProfile } from './storage';
import Tracker from './components/Tracker';
import Watchlist from './components/Watchlist';
import ResumeMatch from './components/ResumeMatch';
import AlertsTab from './tabs/AlertsTab';
import FirstApplyTab from './tabs/FirstApplyTab';
import RemoteTab from './tabs/RemoteTab';
import IntlTab from './tabs/IntlTab';
import HacksTab from './tabs/HacksTab';
import TemplatesTab from './tabs/TemplatesTab';
import HomeTab from './tabs/HomeTab';
import JobsTab from './tabs/JobsTab';
import { themes } from './theme';
import { getCardStyle, getBtnPrimaryStyle, getBtnSecondaryStyle, getTabButtonStyle, getBadgeStyle } from './styles';
import { PLATFORMS } from './data/platforms';
import { ROLES, FRESHNESS_OPTIONS, EXPERIENCE_LEVELS } from './data/roles';

export default function App() {
  const [theme, setTheme]         = useState('dark');
  const [activeTab, setActiveTab] = useState('home');
  const [selectedRegion, setSelectedRegion] = useState('india');
  const [selectedRole, setSelectedRole]     = useState(ROLES[0].keyword);
  const [selectedLocation, setSelectedLocation] = useState('Bengaluru');
  const [selectedFreshness, setSelectedFreshness] = useState(FRESHNESS_OPTIONS[1]); // default: past 24h
  const [selectedExperience, setSelectedExperience] = useState(EXPERIENCE_LEVELS[0]); // default: any
  const [isLoaded, setIsLoaded]   = useState(false);
  const [blockedUrls, setBlockedUrls] = useState([]);
  const [isOpening, setIsOpening] = useState(false);
  const [profile, setProfileState] = useState(() => getProfile());
  const t = themes[theme];

  useEffect(() => { setIsLoaded(true); }, []);

  // Was staggering window.open() calls via setTimeout — that breaks the
  // "direct user click" requirement popup blockers enforce, so most/all of
  // the tabs silently never opened (the button looked broken, but the click
  // handler was actually firing fine). Opening synchronously in the same
  // click-handler tick is what popup blockers allow; anything still blocked
  // (a browser can cap how many at once) gets surfaced instead of silently lost.
  const openMultiple = (urls) => {
    setIsOpening(true);
    setTimeout(() => setIsOpening(false), 500);
    const blocked = urls.filter(u => !window.open(u, '_blank', 'noopener'));
    setBlockedUrls(blocked);
  };

  // Style helpers (defined in src/styles.js as plain functions of the theme)
  const card = getCardStyle(t);
  const btnPrimary = getBtnPrimaryStyle(t);
  const btnSecondary = getBtnSecondaryStyle(t);
  const tabStyle = (active) => getTabButtonStyle(t, active);
  const badge = getBadgeStyle;

  // Quick-launch URLs: built live from PLATFORMS so they always reflect the
  // current role (Product Manager vs Senior PM) and city — the old version
  // was a static list hardcoded to "Product Manager" regardless of toggle.
  const getQuickLaunchUrls = (region, role, location, opts) => {
    const wantsRegion = ([p]) =>
      region==='india'  ? (p.region==='india'  || p.region==='global') :
      region==='remote' ? (p.region==='remote' || p.region==='global') :
                           (p.region==='us'     || p.region==='global');
    return Object.entries(PLATFORMS)
      .filter(wantsRegion)
      .sort((a,b) => a[1].priority - b[1].priority)
      .slice(0, 6)
      .map(([,p]) => p.getUrl(role, region==='india' ? location : '', { ...opts, region }));
  };

  return (
    <div style={{ minHeight:'100vh', background:t.bg, color:t.text, fontFamily:'"Inter",-apple-system,BlinkMacSystemFont,system-ui,sans-serif', transition:'background 0.5s ease,color 0.3s ease' }}>
      {/* Hero glow */}
      <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:t.heroGradient, pointerEvents:'none', zIndex:0, opacity:isLoaded?1:0, transition:'opacity 1s ease' }} />

      {/* NAV */}
      <nav style={{ position:'sticky', top:0, zIndex:1000, backdropFilter:t.glassEffect, WebkitBackdropFilter:t.glassEffect, background:theme==='dark'?'rgba(0,0,0,0.75)':'rgba(255,255,255,0.75)', borderBottom:`0.5px solid ${t.border}` }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button onClick={()=>setActiveTab('home')} style={{ display:'flex', alignItems:'center', gap:'14px', background:'none', border:'none', cursor:'pointer', padding:0, textAlign:'left' }}>
            <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:t.gradient1, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', boxShadow:'0 4px 12px rgba(102,126,234,0.4)' }}>🎯</div>
            <div>
              <h1 style={{ margin:0, fontSize:'19px', fontWeight:'600', letterSpacing:'-0.3px', color:t.text }}>PM Jobs Tracker</h1>
              <p style={{ margin:0, fontSize:'11px', color:t.textSecondary }}>28 platforms • updated daily</p>
            </div>
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ display:'flex', gap:'6px', padding:'4px 8px', background:t.cardBg, border:`1px solid ${t.border}`, borderRadius:'12px' }}>
              {ROLES.map(r => (
                <button key={r.keyword} onClick={()=>setSelectedRole(r.keyword)} style={{ padding:'6px 12px', borderRadius:'8px', border:'none', background:selectedRole===r.keyword?t.accent:'transparent', color:selectedRole===r.keyword?'#fff':t.textSecondary, fontSize:'12px', fontWeight:'500', cursor:'pointer' }}>{r.label}</button>
              ))}
            </div>
            <button onClick={()=>setTheme(theme==='dark'?'light':'dark')} style={{ width:'40px', height:'40px', borderRadius:'50%', background:t.cardBg, border:`1px solid ${t.border}`, color:t.text, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}
            </button>
          </div>
        </div>
      </nav>

      {/* TABS */}
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'16px 24px 0', display:'flex', gap:'6px', overflowX:'auto', position:'relative', zIndex:10 }}>
        {[
          { id:'home',      icon:<Sparkles size={14}/>,   label:'Home' },
          { id:'jobs',      icon:<Briefcase size={14}/>,  label:'All Jobs' },
          { id:'tracker',   icon:<ClipboardList size={14}/>, label:'Tracker', isNew:true },
          { id:'watchlist', icon:<Building2 size={14}/>,  label:'Watchlist', isNew:true },
          { id:'resumematch',icon:<FileSearch size={14}/>,label:'Resume Match', isNew:true },
          { id:'hacks',     icon:<Lightbulb size={14}/>,  label:'Hacks' },
          { id:'alerts',    icon:<Bell size={14}/>,        label:'Alerts' },
          { id:'firstapply',icon:<Zap size={14}/>,         label:'Be First' },
          { id:'remote',    icon:<Globe size={14}/>,       label:'Remote' },
          { id:'intl',      icon:<Target size={14}/>,      label:'US/UK/CA/SG' },
          { id:'templates', icon:<MessageSquare size={14}/>, label:'Templates' },
        ].map(tab => (
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{ ...tabStyle(activeTab===tab.id), position:'relative' }}>
            {tab.icon}{tab.label}
            {tab.isNew && <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:t.success }}/>}
          </button>
        ))}
      </div>

      {/* MAIN */}
      {blockedUrls.length > 0 && (
        <div style={{ maxWidth:'1200px', margin:'16px auto 0', padding:'0 24px', position:'relative', zIndex:10 }}>
          <div style={{ ...card, padding:'16px 20px', display:'flex', alignItems:'center', gap:'14px', flexWrap:'wrap' }}>
            <span style={{ fontSize:'13px', color:t.textSecondary, flex:1, minWidth:'200px' }}>
              Your browser blocked {blockedUrls.length} tab{blockedUrls.length===1?'':'s'} from opening — click to open manually:
            </span>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              {blockedUrls.map((u,i) => <a key={i} href={u} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, padding:'7px 14px', fontSize:'12px' }}>Open #{i+1}</a>)}
            </div>
            <button onClick={()=>setBlockedUrls([])} style={{ background:'none', border:'none', color:t.textTertiary, cursor:'pointer', fontSize:'18px', padding:'0 4px' }}>&times;</button>
          </div>
        </div>
      )}

      <main style={{ maxWidth:'1200px', margin:'0 auto', padding:'24px 24px 80px', position:'relative', zIndex:10 }}>

        {/* ── HOME ── */}
        {activeTab==='home' && (
          <HomeTab
            t={t} card={card} btnPrimary={btnPrimary} btnSecondary={btnSecondary} badge={badge} isLoaded={isLoaded}
            setActiveTab={setActiveTab} setSelectedRegion={setSelectedRegion}
            selectedRole={selectedRole} selectedLocation={selectedLocation}
            selectedFreshness={selectedFreshness} selectedExperience={selectedExperience}
            openMultiple={openMultiple} getQuickLaunchUrls={getQuickLaunchUrls} isOpening={isOpening}
          />
        )}

        {/* ── JOBS ── */}
        {activeTab==='jobs' && (
          <JobsTab
            t={t} card={card} btnPrimary={btnPrimary} badge={badge}
            selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion}
            selectedRole={selectedRole}
            selectedLocation={selectedLocation} setSelectedLocation={setSelectedLocation}
            selectedFreshness={selectedFreshness} setSelectedFreshness={setSelectedFreshness}
            selectedExperience={selectedExperience} setSelectedExperience={setSelectedExperience}
            openMultiple={openMultiple} isOpening={isOpening} getQuickLaunchUrls={getQuickLaunchUrls}
          />
        )}

        {/* ── TRACKER ── */}
        {activeTab==='tracker' && <Tracker t={t} card={card} btnPrimary={btnPrimary} btnSecondary={btnSecondary} />}

        {/* ── WATCHLIST ── */}
        {activeTab==='watchlist' && <Watchlist t={t} card={card} btnPrimary={btnPrimary} btnSecondary={btnSecondary} profile={profile} />}

        {/* ── RESUME MATCH ── */}
        {activeTab==='resumematch' && <ResumeMatch t={t} card={card} btnPrimary={btnPrimary} btnSecondary={btnSecondary} />}

        {/* ── HACKS ── */}
        {activeTab==='hacks' && <HacksTab t={t} theme={theme} card={card} btnPrimary={btnPrimary} btnSecondary={btnSecondary} badge={badge} isLoaded={isLoaded} />}

        {/* ── ALERTS ── */}
        {activeTab==='alerts' && <AlertsTab t={t} theme={theme} card={card} btnPrimary={btnPrimary} />}

        {/* ── BE FIRST ── */}
        {activeTab==='firstapply' && <FirstApplyTab t={t} card={card} />}

        {/* ── REMOTE ── */}
        {activeTab==='remote' && <RemoteTab t={t} card={card} btnSecondary={btnSecondary} />}

        {/* ── INTL ── */}
        {activeTab==='intl' && <IntlTab t={t} card={card} btnSecondary={btnSecondary} />}

        {/* ── TEMPLATES ── */}
        {activeTab==='templates' && <TemplatesTab t={t} card={card} btnPrimary={btnPrimary} profile={profile} onProfileChange={setProfileState} />}

      </main>

      <footer style={{ borderTop:`1px solid ${t.border}`, padding:'20px', textAlign:'center', position:'relative', zIndex:10 }}>
        <p style={{ fontSize:'12px', color:t.textSecondary, margin:0 }}>PM Jobs Tracker • 28 platforms • Built for Product Managers in India 🇮🇳</p>
      </footer>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        h1,h2,h3,h4{font-family:"Space Grotesk",Inter,-apple-system,BlinkMacSystemFont,system-ui,sans-serif;}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.6;transform:scale(0.9);}}
        ::-webkit-scrollbar{width:8px;height:8px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${t.border};border-radius:4px;}
        ::-webkit-scrollbar-thumb:hover{background:${t.textTertiary};}
        ::selection{background:${t.accent};color:#fff;}
        a:hover,button:hover{opacity:0.88;}
      `}</style>
    </div>
  );
}
