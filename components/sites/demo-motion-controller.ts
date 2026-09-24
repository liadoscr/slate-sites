export type DemoMotionStyle = 'orange' | 'forma' | 'move';

/** Demo-specific choreography; server content always remains visible without enhancement. */
export function attachDemoMotion(root: HTMLElement, style: DemoMotionStyle): () => void {
  const view = root.ownerDocument.defaultView;
  if (!view?.matchMedia || !view.IntersectionObserver) return () => {};
  const reduced = view.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) return () => {};
  const small = view.matchMedia('(max-width: 720px), (pointer: coarse)');
  if (!reduced.addEventListener || !small.addEventListener) return () => {};
  const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-demo-enter]'));
  const active = new Map<HTMLElement, Animation>();
  const seen = new Set<HTMLElement>();
  const drift = root.querySelector<HTMLElement>('[data-demo-drift]');
  let observer: IntersectionObserver | undefined;
  let frame = 0;
  let disposed = false;

  const cancel = (element: HTMLElement) => { active.get(element)?.cancel(); active.delete(element); };
  const focus = () => {
    for (const element of targets) if (element.contains(root.ownerDocument.activeElement)) {
      seen.add(element); observer?.unobserve(element); cancel(element);
    }
  };
  const updateDrift = () => {
    frame = 0;
    if (!drift || disposed) return;
    if (small.matches || reduced.matches) { drift.style.removeProperty('translate'); return; }
    const bounds = drift.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > view.innerHeight) return;
    const progress = Math.max(-1, Math.min(1, (view.innerHeight / 2 - bounds.top - bounds.height / 2) / view.innerHeight));
    drift.style.translate = `0 ${progress * (style === 'move' ? 24 : 16)}px`;
  };
  const scroll = () => { if (!frame && !disposed) frame = view.requestAnimationFrame(updateDrift); };
  const cleanup = () => {
    if (disposed) return;
    disposed = true; observer?.disconnect();
    for (const element of active.keys()) cancel(element);
    view.cancelAnimationFrame(frame);
    drift?.style.removeProperty('translate');
    root.removeEventListener('focusin', focus);
    view.removeEventListener('scroll', scroll, true);
    view.removeEventListener('resize', scroll);
    reduced.removeEventListener('change', preference);
    small.removeEventListener('change', scroll);
  };
  const preference = () => { if (reduced.matches) cleanup(); };

  try {
    observer = new view.IntersectionObserver(entries => {
      if (disposed || reduced.matches) return;
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        if (!entry.isIntersecting || entry.intersectionRect.height <= 0 || entry.intersectionRect.width <= 0 || seen.has(element)) continue;
        seen.add(element); observer?.unobserve(element);
        if (element.contains(root.ownerDocument.activeElement) || !element.animate) continue;
        const kind = element.dataset.demoEnter;
        const distance = small.matches ? 14 : style === 'move' ? 48 : 32;
        const order = Math.min(5, Math.max(0, Number(element.dataset.demoOrder) || 0));
        let start: Keyframe = { opacity: 0, transform: `translateY(${distance}px)` };
        let end: Keyframe = { opacity: 1, transform: 'none' };
        if (kind === 'image') {
          // Keep photography painted throughout its entrance (including the LCP image).
          start = style === 'forma' && !small.matches
            ? { clipPath: 'inset(0 0 18% 0 round 32px)', transform: 'scale(.96)' }
            : { transform: `scale(${small.matches ? 1.025 : 1.08})` };
          end = { clipPath: 'inset(0 0 0% 0 round 0px)', transform: 'none' };
        } else if (kind === 'line') {
          start = { opacity: .25, transform: `translateY(${distance}px)${style === 'move' && !small.matches ? ' skewY(3deg)' : ''}` };
        } else if (kind === 'card' && style === 'orange' && !small.matches) {
          start = { opacity: 0, transform: `translateY(${distance}px) rotate(${order % 2 ? 2 : -2}deg) scale(.97)` };
        } else if (kind === 'card' && style === 'move' && !small.matches) {
          start = { opacity: 0, transform: 'translateX(36px)' };
        }
        try {
          const animation = element.animate([start, end], {
            duration: small.matches ? 540 : style === 'forma' ? 1100 : style === 'move' ? 720 : 850,
            delay: order * (small.matches ? 45 : style === 'forma' ? 120 : 90),
            easing: style === 'orange' ? 'cubic-bezier(.16,1,.3,1)' : 'cubic-bezier(.22,.68,0,1)',
            fill: 'backwards',
          });
          active.set(element, animation);
          animation.onfinish = animation.oncancel = () => active.delete(element);
        } catch { /* Unsupported animation APIs must never block content. */ }
      }
    }, { threshold: .01 });
    targets.forEach(element => observer!.observe(element));
    root.addEventListener('focusin', focus);
    reduced.addEventListener('change', preference);
    small.addEventListener('change', scroll);
    view.addEventListener('scroll', scroll, { passive: true, capture: true });
    view.addEventListener('resize', scroll, { passive: true });
    scroll();
  } catch { cleanup(); }
  return cleanup;
}
