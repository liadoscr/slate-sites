'use client';

import { useEffect, useRef } from 'react';
import { attachSiteMotion, type SiteMotionLevel } from './site-motion-controller';

export function SiteMotion({ level, versionId }: { level: SiteMotionLevel; versionId: string }) {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = marker.current?.parentElement;
    if (root) return attachSiteMotion(root, level);
  }, [level, versionId]);
  // Hidden controller only; no wrappers are inserted around sections or grid items.
  return <span ref={marker} hidden aria-hidden="true" />;
}
