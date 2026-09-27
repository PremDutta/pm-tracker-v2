import React from 'react';
import { isNew } from '../data/whatsNew';

// The one NEW pill used everywhere. Renders nothing once the feature's
// NEW window (data/whatsNew.js) has passed.
export default function NewBadge({ id, t, style }) {
  if (!isNew(id)) return null;
  return (
    <span data-testid={`new-${id}`} style={{ padding:'2px 7px', borderRadius:'980px', fontSize:'9px', fontWeight:'700', letterSpacing:'0.5px', color:'#fff', background:t.success, lineHeight:1.4, whiteSpace:'nowrap', ...style }}>
      NEW
    </span>
  );
}
