'use client';

import { useEffect, useRef } from 'react';
import { attachDemoMotion, type DemoMotionStyle } from './demo-motion-controller';

export function DemoMotion({ style }: { style: DemoMotionStyle }) {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = marker.current?.parentElement;
    if (root) return attachDemoMotion(root, style);
  }, [style]);
  return <span hidden aria-hidden="true" ref={marker} />;
}
