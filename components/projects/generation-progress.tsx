'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { uuidPattern } from '@/lib/sites/document';
import styles from './creation-simple.module.css';

type Job = { id: string; state: string; phase: string; error_message?: string; version_id?: string };
export function GenerationProgress({ projectId, jobId }: { projectId: string; jobId: string }) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    let failures = 0;
    async function poll() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(`/api/projects/${projectId}/generate?job=${jobId}`, { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!active) return;
        if (!response.ok || !data.job || data.job.id !== jobId) {
          setError(response.status === 401 ? 'ההתחברות הסתיימה. חזרו לפרויקט והתחברו כדי לראות את התוצאה.' : 'לא הצלחנו למצוא את היצירה. החומרים שלכם נשמרו בפרויקט.'); return;
        }
        failures = 0; setError(''); setJob(data.job);
        if (data.job.state === 'completed') {
          if (uuidPattern.test(data.job.version_id ?? '')) router.replace(`/dashboard/projects/${projectId}/preview?version=${data.job.version_id}`);
          else setError('הפעולה הסתיימה ללא טיוטה. חזרו לפרויקט כדי לבדוק את התוצאה.');
        } else if (data.job.state === 'running') timer = setTimeout(poll, 2500);
      } catch {
        if (!active) return;
        setError('החיבור נקטע. היצירה יכולה להמשיך ברקע; אין צורך להתחיל מחדש.');
        if (++failures < 3) timer = setTimeout(poll, 5000);
      } finally { clearTimeout(timeout); }
    }
    void poll();
    return () => { active = false; clearTimeout(timer); controller?.abort(); };
  }, [projectId, jobId, attempt, router]);
  const phase = job?.state === 'completed' ? 3 : job?.phase === 'saving' ? 2 : job?.phase === 'designing' ? 1 : 0;
  return <section className={styles.progress}>
    <span className="kicker">Slate Sites · יצירה פרטית</span>
    <h1>{job?.state === 'failed' ? 'הטיוטה לא הושלמה הפעם' : job?.state === 'completed' ? 'האתר מוכן. פותחים תצוגה…' : 'האתר שלכם מקבל צורה'}</h1>
    <p>הפרטים והתמונות נשמרו. בסיום תיפתח התצוגה המקדימה אוטומטית. שום דבר לא מתפרסם ללא אישורכם.</p>
    <ol aria-label="התקדמות היצירה">{['מכינים את הפרטים והתמונות', 'יוצרים את העיצוב והתוכן', 'שומרים את הטיוטה הפרטית'].map((label, index) => <li key={label} aria-current={index === phase && job?.state !== 'failed' ? 'step' : undefined}>{index < phase ? '✓ ' : `${index + 1}. `}{label}</li>)}</ol>
    <p role="status">{job?.state === 'failed' ? job.error_message || 'הטיוטה הקודמת נשמרה. אפשר לחזור לפרויקט ולנסות שוב.' : error || 'אפשר לצאת ולחזור לקישור הזה. נמשיך מהמקום שבו עצרתם.'}</p>
    <div className={styles.links}>{error ? <button className="secondary-action" type="button" onClick={() => setAttempt(value => value + 1)}>בדיקת מצב מחדש</button> : null}<Link href={`/dashboard/projects/${projectId}`}>חזרה לפרויקט</Link>{job?.state === 'failed' ? <Link href={`/dashboard/projects/${projectId}/edit`}>בדיקת הפרטים וניסיון נוסף</Link> : null}</div>
  </section>;
}
