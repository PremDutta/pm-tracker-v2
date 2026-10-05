import React, { useState, useEffect, useRef } from 'react';
import { Megaphone, X, ArrowRight, Sparkles } from 'lucide-react';
import { releaseNotes, unseenAnnouncements } from '../data/whatsNew';
import { getSeenReleases, markReleasesSeen } from '../storage';
import NewBadge from './NewBadge';

const POPUP_MAX = 5;

function ReleaseRow({ f, t, onGo }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:t.inlineBg, borderRadius:'12px', flexWrap:'wrap' }}>
      <div style={{ flex:'1 1 240px', minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', marginBottom:'2px' }}>
          <NewBadge id={f.id} t={t} />
          <span style={{ fontSize:'14px', fontWeight:'600' }}>{f.title}</span>
        </div>
        <div style={{ fontSize:'12px', color:t.textSecondary, lineHeight:1.45 }}>{f.desc}</div>
        <div style={{ fontSize:'10px', color:t.textTertiary, marginTop:'3px' }}>{f.date}</div>
      </div>
      <button onClick={() => onGo(f)} aria-label={`Go to feature: ${f.title}`}
        style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'7px 14px', borderRadius:'980px', border:'none', background:t.accent, color:'#fff', fontSize:'12px', fontWeight:600, cursor:'pointer', flexShrink:0 }}>
        Go to feature <ArrowRight size={12}/>
      </button>
    </div>
  );
}

function Dialog({ t, title, onClose, children, label }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:2000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'72px 16px 16px' }}>
      <div role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={ref} onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:'620px', maxHeight:'calc(100vh - 100px)', overflowY:'auto', background:t.surfaceSolid, color:t.text, border:`1px solid ${t.border}`, borderRadius:'20px', padding:'22px', boxShadow:'0 24px 64px rgba(0,0,0,0.25)', outline:'none' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', gap:'10px' }}>
          <h2 style={{ fontSize:'20px', fontWeight:700, display:'flex', alignItems:'center', gap:'8px' }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{ background:'none', border:'none', color:t.textSecondary, cursor:'pointer', padding:'4px' }}><X size={18}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Release announcements:
 *  - a dialog on load listing headline features (data/whatsNew.js) shipped in
 *    the last 14 days that this viewer hasn't acknowledged, each with a
 *    "Go to feature" button; closing it or going to one marks them seen;
 *  - a megaphone button (always in the nav) with an unread count, opening the
 *    full release history.
 */
export default function Announcements({ t, onGo }) {
  const [seen, setSeen] = useState(() => getSeenReleases());
  const [popupIds] = useState(() => unseenAnnouncements(getSeenReleases()).map(f => f.id));
  const [popupOpen, setPopupOpen] = useState(popupIds.length > 0);
  const [panelOpen, setPanelOpen] = useState(false);

  const unread = unseenAnnouncements(seen);
  const popupItems = releaseNotes().filter(f => popupIds.includes(f.id));
  const acknowledge = (ids) => setSeen(markReleasesSeen(ids));

  const closePopup = () => { acknowledge(popupIds); setPopupOpen(false); };
  const openPanel = () => { setPanelOpen(true); acknowledge(unread.map(f => f.id)); };
  const go = (f) => { acknowledge([...popupIds, f.id]); setPopupOpen(false); setPanelOpen(false); onGo(f); };

  return (
    <>
      <button onClick={openPanel} aria-label={unread.length ? `What's new: ${unread.length} unread` : "What's new"} title="What's new"
        style={{ position:'relative', width:'40px', height:'40px', borderRadius:'50%', background:t.cardBg, border:`1px solid ${t.border}`, color:t.text, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Megaphone size={17}/>
        {unread.length > 0 && (
          <span style={{ position:'absolute', top:'-4px', right:'-4px', minWidth:'18px', height:'18px', padding:'0 5px', borderRadius:'980px', background:t.error, color:'#fff', fontSize:'10px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{unread.length}</span>
        )}
      </button>

      {popupOpen && popupItems.length > 0 && (
        <Dialog t={t} label="New features" onClose={closePopup} title={<><Sparkles size={18} style={{ color:t.success }}/> New since your last visit</>}>
          <div style={{ display:'grid', gap:'8px' }}>
            {popupItems.slice(0, POPUP_MAX).map(f => <ReleaseRow key={f.id} f={f} t={t} onGo={go} />)}
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'14px', gap:'10px', flexWrap:'wrap' }}>
            <span style={{ fontSize:'12px', color:t.textTertiary }}>
              {popupItems.length > POPUP_MAX ? `+${popupItems.length - POPUP_MAX} more in ` : 'All updates are always in '}the <Megaphone size={11} style={{ verticalAlign:'-1px' }}/> menu at the top.
            </span>
            <button onClick={closePopup} style={{ padding:'8px 16px', borderRadius:'980px', border:`1px solid ${t.border}`, background:t.cardBg, color:t.text, fontSize:'13px', fontWeight:600, cursor:'pointer' }}>Got it</button>
          </div>
        </Dialog>
      )}

      {panelOpen && (
        <Dialog t={t} label="Release notes" onClose={() => setPanelOpen(false)} title={<><Megaphone size={18}/> What's new</>}>
          <div style={{ display:'grid', gap:'8px' }}>
            {releaseNotes().map(f => <ReleaseRow key={f.id} f={f} t={t} onGo={go} />)}
          </div>
        </Dialog>
      )}
    </>
  );
}
