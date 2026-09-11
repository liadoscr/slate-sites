'use client';
import { useState, type ReactNode } from 'react';
export function PreviewViewport({children}:{children:ReactNode}) {
  const [mobile,setMobile]=useState(false);
  return <><div className="viewport-controls" aria-label="רוחב התצוגה"><button type="button" aria-pressed={!mobile} onClick={()=>setMobile(false)}>מחשב</button><button type="button" aria-pressed={mobile} onClick={()=>setMobile(true)}>מובייל</button></div><div className="preview-viewport" data-mobile={mobile} tabIndex={0} aria-label="תצוגת האתר — אפשר לגלול לעיון בתוכן">{children}</div></>;
}
