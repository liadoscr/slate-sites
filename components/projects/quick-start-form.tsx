'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { defaultCreationSettings } from '@/lib/creation/types';
import styles from './quick-start-form.module.css';

type Props = { userId: string; stockPhotosAvailable: boolean; onManual?: () => void; onBusyChange?: (busy: boolean) => void };
type Draft = { userId: string; businessName: string; description: string; projectId: string; requestId: string; fingerprint: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function writeJson(url: string, method: string, body: unknown) {
  const response = await fetch(url, { method, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'לא הצלחנו לשמור. בדקו את החיבור ונסו שוב.');
  return result;
}

export function QuickStartForm({ userId, stockPhotosAvailable, onManual, onBusyChange }: Props) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [consent, setConsent] = useState(false);
  const [ready, setReady] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);
  const draft = useRef<Draft>({ userId, businessName: '', description: '', projectId: '', requestId: '', fingerprint: '' });
  const inFlight = useRef(false);
  const errorBox = useRef<HTMLDivElement>(null);
  const storageKey = `slate-quick-start:${userId}:new`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const cached = raw ? JSON.parse(raw) : null;
      if (cached?.userId === userId && uuid.test(cached.projectId) && typeof cached.description === 'string') {
        draft.current = { userId, projectId: cached.projectId, businessName: typeof cached.businessName === 'string' ? cached.businessName.slice(0, 120) : '', description: cached.description.slice(0, 2500), requestId: typeof cached.requestId === 'string' && uuid.test(cached.requestId) ? cached.requestId : '', fingerprint: typeof cached.fingerprint === 'string' ? cached.fingerprint.slice(0, 3000) : '' };
        setBusinessName(draft.current.businessName); setDescription(draft.current.description); setResumed(Boolean(draft.current.description));
      }
    } catch { setStorageWarning(true); }
    setReady(true);
  }, [storageKey, userId]);

  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(draft.current)); }
    catch { setStorageWarning(true); }
  }
  useEffect(() => { if (error) errorBox.current?.focus(); }, [error]);

  function update(field: 'businessName' | 'description', value: string) {
    draft.current = { ...draft.current, [field]: value, projectId: draft.current.projectId || crypto.randomUUID() };
    if (field === 'businessName') setBusinessName(value); else setDescription(value);
    setError(''); persist();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || inFlight.current || !stockPhotosAvailable) return;
    const name = businessName.trim();
    const story = description.trim();
    if (story.length < 30 || story.length > 2500) { setError('ספרו על העסק ב־30 תווים לפחות: מה אתם מציעים, למי ובמה אתם שונים.'); return; }
    if (name && (name.length < 2 || name.length > 120)) { setError('שם העסק צריך להיות באורך 2–120 תווים, או שאפשר להשאיר אותו ריק בינתיים.'); return; }
    if (!consent) { setError('אשרו את השימוש ב־AI ובחיפוש תמונות כדי להתחיל.'); return; }
    inFlight.current = true; setError(''); setBusy('שומרים את תיאור העסק…'); onBusyChange?.(true);
    const fingerprint = JSON.stringify({ name, story });
    draft.current = { ...draft.current, businessName, description, projectId: draft.current.projectId || crypto.randomUUID(), requestId: draft.current.fingerprint === fingerprint && draft.current.requestId ? draft.current.requestId : crypto.randomUUID(), fingerprint };
    persist();
    const projectId = draft.current.projectId;
    try {
      await writeJson('/api/projects/brief', 'POST', {
        projectId, businessName: name || 'העסק שלי', businessStory: story,
        businessType: '', primaryGoal: '', location: '', websiteCopy: '', importantLinks: '', tone: '', colors: '', contactEmail: '', contactPhone: '', designNotes: '', designUrl: '',
      });
      await writeJson(`/api/projects/${projectId}/creation`, 'PUT', { settings: { ...defaultCreationSettings(), creationMode: 'automatic', imageSource: 'stock', contactPreference: 'form' } });
      setBusy('מכינים עיצוב, תוכן וחיפוש תמונות מתאימות…');
      const result = await writeJson(`/api/projects/${projectId}/generate`, 'POST', { requestId: draft.current.requestId, consent: true });
      if (typeof result.jobId !== 'string' || !uuid.test(result.jobId)) throw new Error('לא התקבל מזהה יצירה. התיאור נשמר; נסו שוב כדי להמשיך.');
      try { localStorage.removeItem(storageKey); } catch { /* The project is now saved on the server. */ }
      router.replace(`/dashboard/projects/${projectId}/creating?job=${result.jobId}`); router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'לא הצלחנו להתחיל את היצירה. התיאור נשאר כאן — בדקו את החיבור ונסו שוב.');
      setBusy(''); inFlight.current = false; onBusyChange?.(false);
    }
  }

  return <form className={styles.form} onSubmit={submit} aria-busy={Boolean(busy)} noValidate>
    <header className={styles.heading}>
      <span className={styles.badge}>מתיאור קצר לאתר משלכם</span>
      <h2>מה הסיפור של העסק שלכם?</h2>
      <p>ספרו מה אתם עושים. נבנה טיוטה עם עיצוב, תוכן ותמונות מאגר מתאימות — הכול פתוח לשינויים לפני הפרסום.</p>
    </header>
    {resumed ? <p className={styles.resume} role="status">התיאור הקודם שלכם מחכה כאן. אפשר להמשיך מאיפה שעצרתם.</p> : null}
    {!stockPhotosAvailable ? <div className={styles.unavailable} role="status"><strong>בחירת תמונות אוטומטית עדיין לא הוגדרה באתר.</strong><p>אפשר להכין כאן את התיאור להמשך, או ליצור כבר עכשיו עם תמונות משלכם במסלול ״יש לי כיוון עיצובי״.</p>{onManual ? <button type="button" onClick={onManual}>להמשך עם תמונות משלי ←</button> : null}</div> : null}
    <fieldset disabled={!ready || Boolean(busy)} className={styles.fields}>
      <label className={styles.field} htmlFor="quick-business-description">תיאור העסק <span>(חובה)</span></label>
      <textarea id="quick-business-description" value={description} onChange={event => update('description', event.target.value)} required minLength={30} maxLength={2500} rows={6} aria-describedby="quick-description-help quick-description-length" placeholder="למשל: אנחנו קצבייה משפחתית בחיפה. מציעים בשר טרי, נתחים למנגל וייעוץ אישי לבישול. חשוב לנו שהאתר ירגיש חם, מקצועי ומקומי, ויפנה למשפחות ולחובבי בישול." />
      <div className={styles.help}><span id="quick-description-help">מה מציעים, למי זה מתאים ומה מייחד אתכם? אל תוסיפו מידע רגיש.</span><span id="quick-description-length">{description.length}/2500</span></div>
      <label className={styles.field} htmlFor="quick-business-name">שם העסק <span>(אפשר להוסיף בהמשך)</span></label>
      <input id="quick-business-name" value={businessName} onChange={event => update('businessName', event.target.value)} maxLength={120} autoComplete="organization" placeholder="איך קוראים לעסק שלכם?" />
      <div className={styles.next}><strong>את הפרטים הקטנים מוסיפים אחר כך.</strong><p>טלפון, אימייל וכתובת תוסיפו במסך התצוגה המקדימה. לא נמציא פרטים, המלצות או הישגים עבורכם.</p></div>
      <p className={styles.stockNotice}>תמונות המאגר הן להמחשה, לא תיעוד של העסק, הצוות או העבודות שלכם. תוכלו להחליף אותן בתמונות אמיתיות שלכם לפני הפרסום.</p>
      <label className={styles.consent}><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>אני מסכים/ה לשליחת תיאור העסק ל־Google Gemini ליצירת האתר, ולשליחת מילות חיפוש כלליות ל־Pexels לבחירת תמונות מאגר. השימוש יתבצע רק בלחיצה על ״יצירת הטיוטה שלי״.</span></label>
      <button className={styles.submit} type="submit" disabled={!stockPhotosAvailable}>{busy || 'יצירת הטיוטה שלי ←'}</button>
    </fieldset>
    {busy ? <p className={styles.status} role="status">{busy} התיאור נשמר, אין צורך ללחוץ שוב.</p> : null}
    {error ? <div className={styles.error} role="alert" tabIndex={-1} ref={errorBox}>{error}<p>התיאור נשאר כאן. אפשר לתקן ולנסות שוב בלי להתחיל מחדש.</p></div> : null}
    <p className={styles.footnote}>שום דבר לא מתפרסם ללא אישורכם. {storageWarning ? 'השמירה בדפדפן אינה זמינה; שמרו עותק של התיאור לפני סגירת העמוד.' : 'התיאור נשמר בדפדפן הזה עד תחילת היצירה.'}</p>
  </form>;
}
