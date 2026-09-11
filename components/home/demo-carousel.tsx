'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { DemoSummary } from '@/lib/sites/demo-catalog';
import styles from './demo-carousel.module.css';

const previewCopy: Record<string, { firstLine: string; secondLine: string; description: string; services: string[] }> = {
  'orange-gel-v1': { firstLine: 'צבע שעושה', secondLine: 'לך מצב רוח.', description: 'מניקור מדויק, גוונים עם אופי ושעה שהיא רק שלך.', services: ['לק ג׳ל', 'מבנה אנטומי', 'נייל ארט'] },
  'forma-hair-v1': { firstLine: 'שיער שמרגיש', secondLine: 'בדיוק את.', description: 'תספורת שיושבת נכון. צבע שמאיר את הפנים. מקום לסגנון שלך.', services: ['תספורת ועיצוב', 'צבע ובליאז׳', 'טיפוח השיער'] },
  'move-trainer-v1': { firstLine: 'יותר כוח.', secondLine: 'יותר אתם.', description: 'תוכנית ברורה, יחס אישי ואימוני כוח שנכנסים לחיים שלכם.', services: ['אימון אישי', 'אימון זוגי', 'ליווי מרחוק'] },
};

export function DemoCarousel({ demos }: { demos: DemoSummary[] }) {
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

  return <section className={styles.showcase} id="demo-preview" role="region" aria-roledescription="קרוסלה" aria-label="דוגמאות לאתרי עסק">
    <div className={styles.label}><span>מקום לסגנון של כל עסק</span><b>דוגמת עיצוב <bdi>{String(active + 1).padStart(2, '0')} / {String(demos.length).padStart(2, '0')}</bdi></b></div>
    <div className={styles.viewport} id={viewportId} ref={viewport} dir="rtl" tabIndex={demos.length > 1 ? 0 : undefined} aria-label="תצוגות מקדימות של אתרים" aria-describedby={demos.length > 1 ? hintId : undefined} onScroll={onScroll} onKeyDown={onKeyDown}>
      {demos.map((demo, index) => {
        const copy = previewCopy[demo.template];
        return <div className={styles.slide} key={demo.projectId} ref={element => { slides.current[index] = element; }} role="group" aria-roledescription="שקופית" aria-label={`${index + 1} מתוך ${demos.length}: ${demo.name}`} aria-hidden={index !== active}>
          <div className={styles.window} data-demo={demo.template}>
            <div className={styles.windowBar}><span className={styles.windowDots} aria-hidden="true">● ● ●</span><b dir="ltr">{demo.name}</b><span>אתר הדגמה</span></div>
            <div className={styles.hero}><div className={styles.copy}><small>{demo.category}</small><h2>{copy.firstLine}<br /><em>{copy.secondLine}</em></h2><p>{copy.description}</p></div><div className={styles.image}><Image src={demo.image} alt={demo.imageAlt} fill sizes="(max-width: 560px) 43vw, (max-width: 800px) 260px, 280px" preload={index === 0} draggable={false} /></div></div>
            <div className={styles.services}>{copy.services.map(service => <span key={service}>{service}</span>)}</div>
          </div>
        </div>;
      })}
    </div>
    {demos.length > 1 ? <>
      <div className={styles.controls}>
        <button type="button" className={styles.arrow} onClick={() => goTo(activeRef.current - 1)} disabled={active === 0} aria-label="לדוגמה הקודמת" aria-controls={viewportId}><span aria-hidden="true">→</span></button>
        <div className={styles.dots} role="group" aria-label="בחירת דוגמה">{demos.map((demo, index) => <button type="button" key={demo.projectId} onClick={() => goTo(index)} aria-label={`הצגת ${demo.name} — ${demo.category}`} aria-current={index === active ? 'true' : undefined} aria-controls={viewportId}><span /></button>)}</div>
        <button type="button" className={styles.arrow} onClick={() => goTo(activeRef.current + 1)} disabled={active === demos.length - 1} aria-label="לדוגמה הבאה" aria-controls={viewportId}><span aria-hidden="true">←</span></button>
      </div>
      <p className={styles.hint} id={hintId}>החליקו בין הדוגמאות, או השתמשו בחצים</p>
      <p className={styles.srOnly} aria-live="polite" aria-atomic="true">{current.name} · {current.category} · {active + 1} מתוך {demos.length}</p>
    </> : null}
    <div className={styles.footer}><p>דמו מעוצב מראש, להמחשת כיוון — לא תוצר אוטומטי של ה־AI.</p><Link href={`/sites/${current.projectId}`} aria-label={`לצפייה באתר הדמו ${current.name}`}>לצפייה באתר הדמו <bdi>{current.name}</bdi> <span aria-hidden="true">↗</span></Link></div>
  </section>;
}
