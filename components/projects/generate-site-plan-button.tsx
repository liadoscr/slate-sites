'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CreationSettings } from '@/lib/creation/types';
import { uuidPattern } from '@/lib/sites/document';

type Job = { id: string; state: string; phase: string; error_message?: string };
export function GenerateSitePlanButton({ projectId, hasVersion = false }: { projectId: string; assets?: unknown[]; hasVersion?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<CreationSettings | null>(null);
  const [consent, setConsent] = useState(false);
  const waiting = useRef(false);
  const running = job?.state === 'running';
  useEffect(() => {
    let alive = true;
    fetch(`/api/projects/${projectId}/creation`, { cache: 'no-store' }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'לא הצלחנו לטעון את בחירות היצירה.');
      if (alive) setSettings(result.settings);
    }).catch(e => { if (alive) setError(e instanceof Error ? e.message : 'לא הצלחנו לטעון את הפרויקט.'); });
    return () => { alive = false; };
  }, [projectId]);
  useEffect(() => {
    let alive = true; let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch(`/api/projects/${projectId}/generate`, { cache: 'no-store' });
        if (!response.ok) throw new Error('status');
        const result = await response.json(); if (!alive) return;
        setJob(result.job);
        if (result.job?.state === 'running') { waiting.current = true; timer = setTimeout(poll, 3000); }
        else if (waiting.current) { waiting.current = false; router.refresh(); }
      } catch { if (alive) timer = setTimeout(poll, 7000); }
    }
    poll(); return () => { alive = false; clearTimeout(timer); };
  }, [projectId, busy, router]);
  async function generate() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/projects/${projectId}/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: crypto.randomUUID(), consent }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      if (uuidPattern.test(data.jobId ?? '')) {
        router.push(`/dashboard/projects/${projectId}/creating?job=${data.jobId}`);
        return;
      }
      setJob({ id: data.jobId, state: data.state, phase: 'preparing' }); waiting.current = true;
    } catch (e) { setError(e instanceof Error ? e.message : 'לא הצלחנו להתחיל את היצירה.'); }
    finally { setBusy(false); }
  }
  return <section className="generation-panel">
    {running ? <div className="generation-progress" role="status"><b>{job.phase === 'preparing' ? 'מכינים את הבריף והתמונות…' : job.phase === 'saving' ? 'שומרים את האתר החדש…' : 'Gemini עובד על הכיוון שלך…'}</b><p>אפשר לצאת ולחזור. הטיוטה הנוכחית והאתר שפורסם נשארים במקומם עד שהפעולה מסתיימת.</p></div> : null}
    <details open={!hasVersion} className="workspace-details"><summary>{hasVersion ? 'יצירת כיוון נוסף' : 'מוכנים לאתר הראשון שלך?'}</summary>
      <p>{hasVersion ? 'כיוון חדש נשמר כטיוטה חדשה. הגרסאות הקודמות נשארות בהיסטוריה, והאתר שבאוויר לא משתנה עד לפרסום.' : 'תמונת ההשראה, פרטי העסק ובחירות התמונות נשמרו במסלול היצירה.'}</p>
      {settings ? <p className="small-print">{settings.referenceAssetId ? 'תמונת השראה פרטית נבחרה' : 'מתחילים מכיוון עיצוב מוכן'} · {settings.images.filter(image => image.role !== 'reference').length} תמונות עסק נבחרו. {settings.analysis ? `כיוון: ${settings.analysis.summary}` : ''}</p> : null}
      <Link className="secondary-action" href={`/dashboard/projects/${projectId}/edit`}>עדכון ההשראה, העסק והתמונות ←</Link>
      <label className="checkbox"><input type="checkbox" checked={consent} disabled={busy || running} onChange={event => setConsent(event.target.checked)} />אני מאשר/ת לשלוח ל־Google Gemini את הבריף והתמונות שנבחרו. לא כללתי מידע רגיש.</label>
      <p className="small-print">תמונת ההשראה לא מתפרסמת באתר. עד 8 פעולות AI לחשבון ב־24 שעות בזמן הבטא, כולל ניתוח השראה ועריכות.</p>
      <button className="generate-plan-button" type="button" onClick={generate} disabled={busy || running || !consent || !settings}>{busy || running ? 'היצירה בעבודה…' : hasVersion ? 'יצירת כיוון נוסף עם AI' : 'יצירת האתר עם AI'}</button>
    </details>
    {error || job?.state === 'failed' ? <p className="error-message" role="alert">{error || job?.error_message || 'הפעולה לא הסתיימה. התוכן הקודם נשמר ואפשר לנסות שוב.'}</p> : null}
  </section>;
}
