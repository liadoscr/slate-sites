export type SiteMotionLevel = 'off' | 'subtle' | 'expressive';

/** Progressive enhancement: content is never pre-hidden or removed from the tab order. */
export function attachSiteMotion(root: HTMLElement, level: SiteMotionLevel): () => void {
  const view = root.ownerDocument.defaultView;
  if (level === 'off' || !view || typeof view.matchMedia !== 'function' || typeof view.IntersectionObserver !== 'function') return () => {};
  const preference = view.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches) return () => {};

  const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-site-reveal]'));
  const visited = new Set<HTMLElement>();
  const initialized = new Set<HTMLElement>();
  const active = new Map<HTMLElement, Animation>();
  let observer: IntersectionObserver | undefined;
  let disposed = false;

  const cancel = (element: HTMLElement) => {
    active.get(element)?.cancel();
    active.delete(element);
  };
  const markSeen = (element: HTMLElement) => {
    visited.add(element);
    observer?.unobserve(element);
  };
  const onFocus = () => {
    for (const element of targets) {
      if (element.contains(root.ownerDocument.activeElement)) {
        markSeen(element);
        cancel(element);
      }
    }
  };
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    for (const element of active.keys()) cancel(element);
    root.removeEventListener('focusin', onFocus);
    if (typeof preference.removeEventListener === 'function') preference.removeEventListener('change', onPreference);
    else preference.removeListener?.(onPreference);
  };
  const onPreference = () => {
    // Do not restart previously viewed sections when a preference changes back.
    if (preference.matches) cleanup();
  };

  try {
    observer = new view.IntersectionObserver(entries => {
      if (disposed || preference.matches) return;
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        const visible = entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0;
        // The observer accounts for clipped/nested preview scroll containers too.
        // Its first delivery establishes visibility without an entrance animation.
        if (!initialized.has(element)) {
          initialized.add(element);
          if (visible) markSeen(element);
          continue;
        }
        if (!visible || visited.has(element)) continue;
        markSeen(element);
        if (element.contains(root.ownerDocument.activeElement) || typeof element.animate !== 'function') continue;
        try {
          const animation = element.animate([
            { opacity: 0, transform: `translateY(${level === 'expressive' ? 24 : 12}px)` },
            { opacity: 1, transform: 'translateY(0)' },
          ], { duration: level === 'expressive' ? 600 : 420, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'none' });
          active.set(element, animation);
          animation.onfinish = animation.oncancel = () => active.delete(element);
        } catch {
          // An unsupported animation API must not interfere with page content.
        }
      }
    }, { threshold: 0.01, rootMargin: '0px 0px -24px 0px' });

    for (const element of targets) {
      if (element.contains(root.ownerDocument.activeElement)) markSeen(element);
      else observer.observe(element);
    }
    root.addEventListener('focusin', onFocus);
    if (typeof preference.addEventListener === 'function') preference.addEventListener('change', onPreference);
    else preference.addListener?.(onPreference);
  } catch {
    cleanup();
  }
  return cleanup;
}
