// Reusable style objects, each a plain function of the current theme (t).
// Kept as functions (not React hooks) since they don't use useState/useEffect
// internally — they're just "given a theme, return a style object."

export const getCardStyle = (t) => ({
  background: t.cardBg, backdropFilter: 'blur(20px)',
  border: `1px solid ${t.border}`, borderRadius: '20px',
  padding: '24px', transition: 'all 0.3s cubic-bezier(0.25,0.1,0.25,1)'
});

export const getBtnPrimaryStyle = (t) => ({
  display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'10px',
  padding:'14px 28px', background:t.accent, border:'none', borderRadius:'980px',
  color:'#fff', fontSize:'16px', fontWeight:'500', cursor:'pointer',
  transition:'all 0.3s cubic-bezier(0.25,0.1,0.25,1)',
  boxShadow:`0 4px 24px ${t.accentGlow}`, textDecoration:'none'
});

export const getBtnSecondaryStyle = (t) => ({
  display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'8px',
  padding:'11px 22px', background:t.cardBg, border:`1px solid ${t.border}`,
  borderRadius:'980px', color:t.text, fontSize:'14px', fontWeight:'500',
  cursor:'pointer', transition:'all 0.2s ease', textDecoration:'none'
});

export const getTabButtonStyle = (t, active) => ({
  padding:'9px 18px', background:active ? t.accent : 'transparent', border:'none',
  borderRadius:'980px', color:active ? '#fff' : t.textSecondary, fontSize:'13px',
  fontWeight:'500', cursor:'pointer', transition:'all 0.2s ease',
  display:'flex', alignItems:'center', gap:'7px', whiteSpace:'nowrap'
});

export const getBadgeStyle = (color, bg) => ({
  padding:'3px 8px', borderRadius:'8px', fontSize:'10px', fontWeight:'700',
  letterSpacing:'0.5px', color:color, background:bg
});
