import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isNew } from '../data/whatsNew';

/**
 * Grouped, sticky tab bar. groups: [{ label, tabs: [{ id, icon, label }] }].
 * Overflow shows faded edges and ‹ › buttons; the active tab scrolls into view.
 * New features get a small dot instead of a "NEW" pill.
 */
export default function TabBar({ t, groups, activeTab, onSelect }) {
  const ref = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  useEffect(() => {
    ref.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activeTab]);

  const scrollBy = (dx) => ref.current?.scrollBy({ left: dx, behavior: 'smooth' });
  const fade = `linear-gradient(to right, ${edges.left ? 'transparent' : '#000'} 0, #000 ${edges.left ? '40px' : '0'}, #000 calc(100% - ${edges.right ? '40px' : '0px'}), ${edges.right ? 'transparent' : '#000'} 100%)`;
  const arrow = (side) => ({
    position: 'absolute', top: '50%', [side]: '4px', transform: 'translateY(-50%)', zIndex: 2,
    width: '28px', height: '28px', borderRadius: '50%', border: `1px solid ${t.border}`, background: t.surfaceSolid,
    color: t.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  });

  return (
    <div style={{ position: 'relative' }}>
      {edges.left && <button className="tab-arrow" onClick={() => scrollBy(-240)} aria-label="Scroll tabs left" style={arrow('left')}><ChevronLeft size={15}/></button>}
      <div ref={ref} onScroll={measure} className="tab-scroll"
        style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', scrollbarWidth: 'none', padding: '8px 0', WebkitMaskImage: fade, maskImage: fade }}>
        {groups.map((g, gi) => (
          <React.Fragment key={g.label || gi}>
            {gi > 0 && <span aria-hidden="true" style={{ width: '1px', height: '20px', background: t.border, margin: '0 6px', flexShrink: 0 }} />}
            {g.label && <span className="tab-group-label" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: t.textTertiary, marginRight: '4px', flexShrink: 0 }}>{g.label}</span>}
            {g.tabs.map(tab => {
              const active = activeTab === tab.id;
              const fresh = isNew(`tab:${tab.id}`);
              return (
                <button key={tab.id} onClick={() => onSelect(tab.id)} aria-label={tab.label} aria-current={active ? 'page' : undefined}
                  title={fresh ? `${tab.label} (new)` : tab.label}
                  style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 11px', borderRadius: '980px', border: 'none',
                    background: active ? t.accent : 'transparent', color: active ? '#fff' : t.textSecondary, fontSize: '13px', fontWeight: active ? 600 : 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <span className="tab-icon" style={{ display:'flex' }}>{tab.icon}</span>{tab.label}
                  {fresh && <span data-testid={`new-tab:${tab.id}`} style={{ width: '6px', height: '6px', borderRadius: '50%', background: active ? '#fff' : t.success, flexShrink: 0 }} />}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      {edges.right && <button className="tab-arrow" onClick={() => scrollBy(240)} aria-label="Scroll tabs right" style={arrow('right')}><ChevronRight size={15}/></button>}
    </div>
  );
}
