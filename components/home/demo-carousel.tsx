'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { DemoSummary } from '@/lib/sites/demo-catalog';
import styles from './demo-carousel.module.css';

const previewCopy: Record<string, { firstLine: string; secondLine: string; description: string; services: string[] }> = {
  'orange-gel-v1': { firstLine: 'צבע שעושה', secondLine: 'לך מצב רוח.', description: 'מניקור מדויק, גוונים עם אופי ושעה שהיא רק שלך.', services: ['לק ג׳ל', 'מבנה אנטומי', 'נייל ארט'] },
  'forma-hair-v1': { firstLine: 'שיער שמרגיש', secondLine: 'בדיוק את.', description: 'תספורת שיושבת נכון. צבע שמאיר את הפנים. מקום לסגנון שלך.', services: ['תספורת ועיצוב', 'צבע ובליאז׳', 'טיפוח השיער'] },
  'move-trainer-v1': { firstLine: 'למצוא את', secondLine: 'הקצב שלכם.', description: 'אימון אישי שמתחיל במקום שבו אתם נמצאים, ומתקדם יחד איתכם.', services: ['אימון אישי', 'אימון זוגי', 'ליווי מרחוק'] },
};

const carouselCopy = {
  he: {
    roledescription: 'קרוסלה', regionLabel: 'דוגמאות לאתרי עסק',
    label: 'מקום לסגנון של כל עסק', counter: 'דוגמת עיצוב',
    viewportLabel: 'תצוגות מקדימות של אתרים', slide: 'שקופית', of: 'מתוך',
    previous: 'לדוגמה הקודמת', next: 'לדוגמה הבאה', picker: 'בחירת דוגמה',
    show: 'הצגת', hint: 'החליקו בין הדוגמאות, או השתמשו בחצים',
    disclaimer: 'דמו מעוצב מראש, להמחשת כיוון — לא תוצר אוטומטי של ה־AI.',
    demoLink: 'לצפייה באתר הדמו', demoLinkLabel: 'לצפייה באתר הדמו',
  },
  en: {
    roledescription: 'carousel', regionLabel: 'Business website examples',
    label: 'A style for every business', counter: 'Design example',
    viewportLabel: 'Website previews', slide: 'slide', of: 'of',
    previous: 'Previous example', next: 'Next example', picker: 'Choose an example',
    show: 'Show', hint: 'Swipe through the examples, or use the arrows',
    disclaimer: 'A predesigned example to show a direction — not an AI-generated result.',
    demoLink: 'View demo website', demoLinkLabel: 'View demo website',
  },
} as const;

export function DemoCarousel({ demos, locale = 'he' }: { demos: DemoSummary[]; locale?: 'he' | 'en' }) {
  const ui = carouselCopy[locale];
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const viewport = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const frame = useRef<number | null>(null);
  const viewportId = useId();
  const hintId = useId();
  const current = demos[active] ?? demos[0];

  function goTo(index: number, smooth = true) {
    const track = viewport.current;
    const slide = slides.current[index];
    if (!track || !slide || index < 0 || index >= demos.length) return;
    // Measure the right edges: RTL scrollLeft is negative in modern browsers.
    // No page-level scrollIntoView, so moving slides never shifts the page vertically.
    const left = track.scrollLeft + slide.getBoundingClientRect().right - track.getBoundingClientRect().right;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left, behavior: smooth && !reduceMotion ? 'smooth' : 'instant' });
  }

  function syncVisibleSlide() {
    const track = viewport.current;
    if (!track || !demos.length) return;
    const bounds = track.getBoundingClientRect();
    const center = (bounds.left + bounds.right) / 2;
    let closest = 0;
    let distance = Infinity;
    slides.current.forEach((slide, index) => {
      if (!slide || index >= demos.length) return;
      const rect = slide.getBoundingClientRect();
      const next = Math.abs((rect.left + rect.right) / 2 - center);
      if (next < distance) { closest = index; distance = next; }
    });
    activeRef.current = closest;
    setActive(closest);
  }

  function onScroll() {
    if (frame.current !== null) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = null;
      syncVisibleSlide();
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = event.key === 'ArrowLeft' ? activeRef.current + 1
      : event.key === 'ArrowRight' ? activeRef.current - 1
      : event.key === 'Home' ? 0 : event.key === 'End' ? demos.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    goTo(Math.max(0, Math.min(demos.length - 1, next)));
  }

  useEffect(() => {
    const track = viewport.current;
    if (!track) return;
    const observer = new ResizeObserver(() => {
      const slide = slides.current[activeRef.current];
      if (!slide) return;
      const left = track.scrollLeft + slide.getBoundingClientRect().right - track.getBoundingClientRect().right;
      track.scrollTo({ left, behavior: 'instant' });
    });
    observer.observe(track);
    return () => {
      observer.disconnect();
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  if (!current) return null;

  return <section className={styles.showcase} id="demo-preview" dir={locale === 'en' ? 'ltr' : 'rtl'} role="region" aria-roledescription={ui.roledescription} aria-label={ui.regionLabel}>
    <div className={styles.label}><span>{ui.label}</span><b>{ui.counter} <bdi>{String(active + 1).padStart(2, '0')} / {String(demos.length).padStart(2, '0')}</bdi></b></div>
    <div className={styles.viewport} id={viewportId} ref={viewport} dir="rtl" tabIndex={demos.length > 1 ? 0 : undefined} aria-label={ui.viewportLabel} aria-describedby={demos.length > 1 ? hintId : undefined} onScroll={onScroll} onKeyDown={onKeyDown}>
      {demos.map((demo, index) => {
        const copy = previewCopy[demo.template];
        return <div className={styles.slide} key={demo.projectId} ref={element => { slides.current[index] = element; }} role="group" aria-roledescription={ui.slide} aria-label={`${index + 1} ${ui.of} ${demos.length}: ${demo.name}`} aria-hidden={index !== active}>
          {demo.template === 'forma-hair-v1' ? <div className={styles.formaPreview}>
            <div className={styles.formaNav}><b dir="ltr">forma<span>HAIR ATELIER</span></b><span>סטודיו בוטיק לשיער · תל אביב</span><span>תפריט <span aria-hidden="true">↗</span></span></div>
            <div className={styles.formaHeading}><small>THE EVERYDAY MUSE / 01</small><h2>{copy.firstLine}<br />{copy.secondLine}</h2><p>{copy.description}</p></div>
            <div className={styles.formaFeature}><div className={styles.formaPhoto}><Image src={demo.image} alt={demo.imageAlt} fill sizes="(max-width: 800px) 80vw, 530px" draggable={false} /></div><div className={styles.formaAside}><span dir="ltr">FORMA / 2026</span><strong>תנועה.<br />מרקם.<br />את.</strong><span>דיוק אישי בכל פרט</span></div></div>
            <div className={styles.formaFoot}><span>01 / גזירה אישית</span><span>02 / צבע עם עומק</span><span>03 / טיפוח השיער</span></div>
          </div> : demo.template === 'move-trainer-v1' ? <div className={styles.movePreview}>
            <div className={styles.moveNav}><b dir="ltr">MOVE<span>PERSONAL TRAINING</span></b><span>הדרך · האימונים · עלינו</span><span>LET’S MOVE ↗</span></div>
            <div className={styles.moveHero}><Image src={demo.image} alt={demo.imageAlt} fill sizes="(max-width: 800px) 90vw, 850px" draggable={false} /><div className={styles.moveOverlay}><small>YOUR PACE. YOUR PROGRESS.</small><h2>{copy.firstLine}<br /><em>{copy.secondLine}</em></h2><p>{copy.description}</p><span className={styles.movePill}>מגלים את הדרך <span aria-hidden="true">↙</span></span></div><span className={styles.moveIndex} dir="ltr">01 — 03</span></div>
            <div className={styles.moveFoot}><b dir="ltr">MOVE / FORWARD</b><span>אימון אישי</span><span>אימון זוגי</span><span>ליווי מרחוק</span></div>
          </div> : <div className={styles.window} data-demo={demo.template}>
            <div className={styles.windowBar}><span className={styles.windowDots} aria-hidden="true">● ● ●</span><b dir="ltr">{demo.name}</b><span>אתר הדגמה</span></div>
            <div className={styles.hero}><div className={styles.copy}><small>{demo.category}</small><h2>{copy.firstLine}<br /><em>{copy.secondLine}</em></h2><p>{copy.description}</p></div><div className={styles.image}><Image src={demo.image} alt={demo.imageAlt} fill sizes="(max-width: 560px) 43vw, (max-width: 800px) 260px, 280px" preload={index === 0} draggable={false} /></div></div>
            <div className={styles.services}>{copy.services.map(service => <span key={service}>{service}</span>)}</div>
          </div>}
        </div>;
      })}
    </div>
    {demos.length > 1 ? <>
      <div className={styles.controls}>
        <button type="button" className={styles.arrow} onClick={() => goTo(activeRef.current - 1)} disabled={active === 0} aria-label={ui.previous} aria-controls={viewportId}><span aria-hidden="true">→</span></button>
        <div className={styles.dots} role="group" aria-label={ui.picker}>{demos.map((demo, index) => <button type="button" key={demo.projectId} onClick={() => goTo(index)} aria-label={`${ui.show} ${demo.name} — ${demo.category}`} aria-current={index === active ? 'true' : undefined} aria-controls={viewportId}><span /></button>)}</div>
        <button type="button" className={styles.arrow} onClick={() => goTo(activeRef.current + 1)} disabled={active === demos.length - 1} aria-label={ui.next} aria-controls={viewportId}><span aria-hidden="true">←</span></button>
      </div>
      <p className={styles.hint} id={hintId}>{ui.hint}</p>
      <p className={styles.srOnly} aria-live="polite" aria-atomic="true">{current.name} · {current.category} · {active + 1} {ui.of} {demos.length}</p>
    </> : null}
    <div className={styles.footer}><p>{ui.disclaimer}</p><Link href={`/sites/${current.projectId}`} aria-label={`${ui.demoLinkLabel} ${current.name}`}>{ui.demoLink} <bdi>{current.name}</bdi> <span aria-hidden="true">↗</span></Link></div>
  </section>;
}
