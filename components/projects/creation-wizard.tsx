'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { defaultCreationSettings, type CreationSettings, type CreationImage } from '@/lib/creation/types';
import styles from './creation-wizard.module.css';

export type CreationBrief = {
  businessName: string; businessType: string; location: string; businessStory: string;
  primaryGoal: string; websiteCopy: string; importantLinks: string; tone: string;
  colors: string; contactEmail: string; contactPhone: string; designNotes: string; designUrl: string;
};
type Asset = { id: string; original_name: string; mime_type: string; size_bytes: number; storage_path: string; url?: string | null };
type Props = { userId: string; projectId?: string; initialBrief?: CreationBrief };
const emptyBrief: CreationBrief = { businessName: '', businessType: '', location: '', businessStory: '', primaryGoal: '', websiteCopy: '', importantLinks: '', tone: '', colors: '', contactEmail: '', contactPhone: '', designNotes: '', designUrl: '' };
const steps = ['על העסק', 'העיצוב', 'תמונות ויצירה'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'לא הצלחנו להשלים את הפעולה. נסו שוב.');
  return result;
}
function writeRequest(method: string, value: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) };
}
function helpfulQuestion(type: string) {
  if (/קצב|בשר|butcher/i.test(type)) return 'אילו מוצרים אתם מציעים? למשל: נתחים טריים, הכנה למנגל ושירות בשכונה. כתבו רק מה שנכון לעסק שלכם.';
  if (/שיער|מספר|ספרות|hair/i.test(type)) return 'אילו שירותי שיער מציעים, למי הם מתאימים ומה מייחד את הגישה שלכם?';
  if (/כושר|מאמ|fitness|trainer/i.test(type)) return 'אילו סוגי אימון מציעים, לאילו קהלים ובאיזה אזור? ציינו הכשרות רק אם יש לכם.';
  if (/ציפור|לק|nail|קוסמט/i.test(type)) return 'אילו טיפולים מציעים, באיזה אזור ומה מאפיין את סגנון העבודה שלכם?';
  return 'מה אתם עושים, למי השירות מתאים ולמה לקוחות בוחרים דווקא בכם?';
}

export function CreationWizard({ userId, projectId: existingId, initialBrief }: Props) {
  const router = useRouter();
  const [brief, setBrief] = useState(initialBrief ?? emptyBrief);
  const [settings, setSettings] = useState<CreationSettings>(defaultCreationSettings);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState('');
  const [rights, setRights] = useState(false);
  const [referenceRights, setReferenceRights] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [analyzeConsent, setAnalyzeConsent] = useState(false);
  const [withoutPhotos, setWithoutPhotos] = useState(false);
  const [designChoice, setDesignChoice] = useState<'reference' | 'style'>('reference');
  const actionInFlight = useRef(false);
  const generationAttempt = useRef<{ key: string; id: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const id = useRef(existingId ?? '');
  const saved = useRef('');
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const latest = useRef({ brief, settings });
  const mounted = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const storageKey = `slate-creation:${userId}:${existingId ?? 'new'}`;
  latest.current = { brief, settings };

  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    async function load() {
      let restoredBrief = initialBrief ?? emptyBrief;
      try {
        if (!existingId) {
          // Only the authenticated user's unfinished new-project draft is resumed.
          let cached: { userId?: string; projectId?: string; brief?: Record<string, unknown>; step?: number } | null = null;
          try { const raw = localStorage.getItem(storageKey); cached = raw ? JSON.parse(raw) : null; } catch { /* Browser storage is optional. */ }
          if (cached?.userId === userId && typeof cached.projectId === 'string' && uuid.test(cached.projectId) && cached.brief && typeof cached.brief.businessName === 'string') {
            id.current = cached.projectId;
            const values = cached.brief;
            restoredBrief = Object.fromEntries(Object.keys(emptyBrief).map(key => [key, typeof values[key] === 'string' ? values[key].slice(0, 4000) : ''])) as CreationBrief;
            restoredBrief.designUrl = '';
            setBrief(restoredBrief); setStep(Math.max(0, Math.min(2, Number(cached.step) || 0))); setResumed(true);
          }
        }
        if (id.current) {
          const [config, media] = await Promise.all([
            jsonRequest(`/api/projects/${id.current}/creation`),
            jsonRequest(`/api/projects/${id.current}/assets`),
          ]);
          if (cancelled) return;
          setSettings(config.settings ?? defaultCreationSettings()); setAssets(media.assets ?? []);
          setDesignChoice(config.settings?.referenceAssetId ? 'reference' : 'style');
          // Local resumed text may include edits that never reached the server.
          saved.current = existingId ? JSON.stringify({ brief: restoredBrief, settings: config.settings ?? defaultCreationSettings() }) : '';
          if (existingId) setSaveState('כל השינויים נשמרו');
        }
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setError('לא הצלחנו לטעון את הטיוטה. רעננו את העמוד לפני שתמשיכו, כדי לא לדרוס בחירות קודמות.');
      }
    }
    void load();
    return () => { cancelled = true; mounted.current = false; };
  }, [existingId, initialBrief, storageKey, userId]);

  function updateBrief(key: keyof CreationBrief, value: string) { const next = { ...latest.current.brief, [key]: value }; latest.current = { ...latest.current, brief: next }; setBrief(next); }
  function updateSettings(patch: Partial<CreationSettings>) { const next = { ...latest.current.settings, ...patch }; latest.current = { ...latest.current, settings: next }; setSettings(next); }
  function saveDraft() {
    const snapshot = latest.current;
    const serialized = JSON.stringify(snapshot);
    const operation = queue.current.catch(() => undefined).then(async () => {
      if (snapshot.brief.businessName.trim().length < 2) throw new Error('הוסיפו שם עסק באורך שתי אותיות לפחות.');
      if (saved.current === serialized && id.current) return id.current;
      id.current ||= crypto.randomUUID();
      if (mounted.current) setSaveState('שומרים את הטיוטה…');
      await jsonRequest('/api/projects/brief', writeRequest('POST', { ...snapshot.brief, projectId: id.current, designUrl: '' }));
      await jsonRequest(`/api/projects/${id.current}/creation`, writeRequest('PUT', { settings: snapshot.settings }));
      saved.current = serialized;
      if (mounted.current) setSaveState('כל השינויים נשמרו');
      return id.current;
    });
    queue.current = operation;
    return operation;
  }

  useEffect(() => {
    if (!ready || busy) return;
    try { if (id.current) localStorage.setItem(storageKey, JSON.stringify({ userId, projectId: id.current, brief, step })); } catch { /* Server autosave still works. */ }
    if (brief.businessName.trim().length < 2) return;
    const timeout = window.setTimeout(() => {
      void saveDraft().then(() => {
        try { localStorage.setItem(storageKey, JSON.stringify({ userId, projectId: id.current, brief, step })); } catch { /* no-op */ }
      }).catch(e => setSaveState(`השינויים עדיין לא נשמרו: ${e instanceof Error ? e.message : 'בדקו את החיבור'}`));
    }, 1100);
    return () => window.clearTimeout(timeout);
    // saveDraft serializes writes; status changes must not trigger another save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brief, settings, step, ready, busy, storageKey, userId]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (ready && brief.businessName.trim() && saved.current !== JSON.stringify(latest.current)) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [ready, brief.businessName]);

  async function goTo(next: number) {
    if (!ready || busy || actionInFlight.current) return;
    setError('');
    if (next > step && ![brief.businessStory, brief.websiteCopy, brief.primaryGoal].some(value => value.trim())) {
      setError('ספרו במשפט אחד מה העסק מציע. אנחנו נעזור בניסוח.'); setStep(0); return;
    }
    if (next > 1 && settings.referenceAssetId && !settings.analysis && !analyzeConsent) {
      setError('אשרו את ניתוח התמונה כדי שנוכל ללמוד את הכיוון העיצובי.'); setStep(1); return;
    }
    actionInFlight.current = true;
    setBusy('save');
    try {
      const project = await saveDraft();
      if (next > 1 && settings.referenceAssetId && !settings.analysis) {
        setBusy('analyze');
        const result = await jsonRequest(`/api/projects/${project}/analyze`, writeRequest('POST', { requestId: crypto.randomUUID(), consent: true }));
        setSettings(result.settings); latest.current = { ...latest.current, settings: result.settings };
        saved.current = JSON.stringify(latest.current);
      }
      setStep(next); requestAnimationFrame(() => heading.current?.focus());
    } catch (e) { setError(e instanceof Error ? e.message : 'לא הצלחנו לשמור.'); }
    finally { setBusy(''); actionInFlight.current = false; }
  }

  async function upload(files: File[], role: CreationImage['role']) {
    if (!files.length || busy || !ready || actionInFlight.current) return;
    setError('');
    if (!(role === 'reference' ? referenceRights : rights)) { setError('לפני ההעלאה, אשרו שיש לכם הרשאה להשתמש בתמונות.'); return; }
    const selected = settings.images.filter(image => (role !== 'reference' || image.role !== 'reference') && (role !== 'logo' || image.role !== 'logo'));
    const bytes = selected.reduce((total, image) => total + (assets.find(asset => asset.id === image.id)?.size_bytes ?? 0), 0);
    if (selected.length + files.length > 6 || files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) || files.reduce((total, file) => total + file.size, bytes) > 12 * 1024 * 1024) {
      setError('בחרו עד 6 תמונות בסך הכול, JPG / PNG / WebP עד 4MB לתמונה ועד 12MB לכל הבחירה.'); return;
    }
    actionInFlight.current = true;
    setBusy('upload');
    try {
      const project = await saveDraft();
      let nextSettings = { ...latest.current.settings, images: [...selected] };
      for (const file of files) {
        const placedRole = role === 'gallery' && !nextSettings.images.some(image => image.role === 'hero') ? 'hero' : role;
        const form = new FormData(); form.set('file', file); form.set('role', placedRole); form.set('alt', role === 'reference' ? 'תמונת השראה לעיצוב' : file.name.replace(/\.[^.]+$/, '').slice(0, 180) || 'תמונת העסק');
        const result = await jsonRequest(`/api/projects/${project}/assets`, { method: 'POST', body: form });
        setAssets(previous => [...previous.filter(asset => asset.id !== result.asset.id), result.asset]);
        nextSettings = { ...nextSettings, images: [...nextSettings.images, result.image], ...(role === 'reference' ? { referenceAssetId: result.image.id, analysis: undefined } : {}) };
        // Save each successful selection separately, including after partial upload failure.
        const stored = await jsonRequest(`/api/projects/${project}/creation`, writeRequest('PUT', { settings: nextSettings }));
        nextSettings = stored.settings ?? nextSettings;
        setSettings(nextSettings); latest.current = { ...latest.current, settings: nextSettings };
        saved.current = JSON.stringify(latest.current);
      }
      setSaveState('התמונות והבחירות נשמרו');
    } catch (e) { setError(e instanceof Error ? e.message : 'ההעלאה לא הושלמה.'); }
    finally { setBusy(''); actionInFlight.current = false; }
  }

  async function finish(generate: boolean) {
    if (!ready || busy || actionInFlight.current) return;
    if (generate && !aiConsent) { setError('אשרו את שליחת התוכן והתמונות שנבחרו ל־Gemini.'); return; }
    if (generate && ![brief.businessStory, brief.websiteCopy, brief.primaryGoal].some(value => value.trim())) { setError('ספרו לפחות משפט אחד על העסק.'); setStep(0); return; }
    if (generate && !settings.images.some(image => image.role === 'hero' || image.role === 'gallery') && !withoutPhotos) {
      setError('הוסיפו תמונות עסק או בחרו במפורש ליצור בלי תמונות.'); return;
    }
    actionInFlight.current = true;
    setBusy(generate ? 'generate' : 'save'); setError('');
    try {
      const project = await saveDraft();
      let destination = `/dashboard/projects/${project}`;
      if (generate) {
        const key = JSON.stringify(latest.current);
        if (generationAttempt.current?.key !== key) generationAttempt.current = { key, id: crypto.randomUUID() };
        const result = await jsonRequest(`/api/projects/${project}/generate`, writeRequest('POST', { requestId: generationAttempt.current.id, consent: true }));
        if (!uuid.test(result.jobId)) throw new Error('לא התקבל מזהה יצירה. נסו שוב.');
        destination += `/creating?job=${result.jobId}`;
      }
      try { localStorage.removeItem(storageKey); } catch { /* no-op */ }
      router.replace(destination); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'לא הצלחנו להמשיך.'); setBusy(''); actionInFlight.current = false; }
  }

  const reference = assets.find(asset => asset.id === settings.referenceAssetId);
  const businessImages = settings.images.filter(image => image.role !== 'reference');
  const palette = settings.analysis?.palette ?? [];
  const photos = businessImages.filter(image => image.role !== 'logo');
  const logo = businessImages.find(image => image.role === 'logo');
  function removeImage(imageId: string) {
    updateSettings({ images: settings.images.filter(image => image.id !== imageId), ...(settings.referenceAssetId === imageId ? { referenceAssetId: null, analysis: undefined } : {}) });
  }
  function addExisting(asset: Asset) {
    const role = asset.storage_path.includes('/reference/') ? 'reference' : 'gallery';
    const current = settings.images.filter(image => role !== 'reference' || image.role !== 'reference');
    const size = current.reduce((sum, image) => sum + (assets.find(item => item.id === image.id)?.size_bytes ?? 0), asset.size_bytes);
    if (current.length >= 6 || size > 12 * 1024 * 1024) { setError('הבחירה מוגבלת ל־6 תמונות ועד 12MB יחד.'); return; }
    updateSettings({ images: [...current, { id: asset.id, role, alt: asset.original_name.replace(/\.[^.]+$/, '').slice(0, 180) || 'תמונת העסק' }], ...(role === 'reference' ? { referenceAssetId: asset.id, analysis: undefined } : {}) });
  }
  function pasteImage(event: ClipboardEvent<HTMLDivElement>) {
    const file = Array.from(event.clipboardData.files).find(item => item.type.startsWith('image/'));
    if (file) { event.preventDefault(); void upload([file], 'reference'); }
  }
  function dropImage(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragging(false); void upload(Array.from(event.dataTransfer.files).slice(0, 1), 'reference'); }
  const input = (label: string, key: keyof CreationBrief, placeholder = '', kind = 'text', maxLength = 120) => <label className={styles.field}>{label}<input type={kind} value={brief[key]} maxLength={maxLength} required={key === 'businessName'} placeholder={placeholder} dir={kind === 'tel' || kind === 'email' ? 'ltr' : undefined} onChange={event => updateBrief(key, event.target.value)} /></label>;
  const availableAssets = assets.filter(asset => !settings.images.some(image => image.id === asset.id) && ['image/jpeg', 'image/png', 'image/webp'].includes(asset.mime_type) && asset.size_bytes <= 8 * 1024 * 1024);

  return <div className={styles.wizard} dir="rtl">
    <div className={styles.topline}><span className={styles.badge}>טיוטה פרטית · אתם מחליטים מתי לפרסם</span><span className={styles.saveStatus} role="status">{!ready && !error ? 'טוענים את הטיוטה…' : saveState || 'השינויים נשמרים אוטומטית'}</span></div>
    {resumed ? <p className={styles.resume}>ממשיכים מאיפה שעצרתם. הפרטים והתמונות שלכם נשמרו.</p> : null}
    <nav aria-label="שלבי יצירת האתר"><ol className={styles.steps}>{steps.map((name, index) => <li key={name}><button type="button" aria-current={step === index ? 'step' : undefined} disabled={!ready || !!busy} onClick={() => void goTo(index)}><span>{index + 1}</span><b>{name}</b></button></li>)}</ol></nav>
    <section className={styles.main} aria-labelledby="creation-step-heading">
      <div className={styles.sectionHeading}><span>שלב {step + 1} מתוך 3</span><h2 id="creation-step-heading" tabIndex={-1} ref={heading}>{['ספרו לנו על העסק.', 'איך תרצו שהאתר ירגיש?', 'עוד רגע, והאתר שלכם כאן.'][step]}</h2><p>{['לא צריך לכתוב כמו קופירייטר. כמה פרטים אמיתיים יספיקו לטיוטה הראשונה.', 'צילום מסך שאהבתם או סגנון מוכן. את הפרטים הקטנים אפשר לדייק אחר כך.', 'בחרו את התמונות שהמבקרים יראו ואיך יפנו אליכם. אפשר לשנות הכול בתצוגה המקדימה.'][step]}</p></div>
      <fieldset className={styles.fields} disabled={!ready || !!busy}>
        {step === 0 ? <>
          <div className={styles.grid}>{input('שם העסק *', 'businessName', 'למשל: הקצבייה של דני')}{input('במה העסק עוסק?', 'businessType', 'למשל: קצבייה, מספרה או אימון אישי')}</div>
          <label className={styles.field}>מה אתם מציעים ללקוחות? *<textarea value={brief.businessStory} maxLength={2500} onChange={event => updateBrief('businessStory', event.target.value)} placeholder={helpfulQuestion(brief.businessType)} /><small>אפשר לכתוב במשפטים קצרים. ננסח מהם את האתר, בלי להמציא עובדות.</small></label>
          {input('איפה אתם פועלים? — לא חובה', 'location', 'עיר, אזור או אונליין')}
          <details className={styles.more}><summary>עוד פרטים שחשובים לכם — לא חובה</summary>{input('מה תרצו להדגיש?', 'primaryGoal', 'למשל: שירות אישי ומוצרים מקומיים', 'text', 500)}<label className={styles.field}>סגנון הכתיבה<select value={brief.tone} onChange={event => updateBrief('tone', event.target.value)}><option value="">בחרו בשבילי</option><option>נקי ומקצועי</option><option>חם ואישי</option><option>נועז וישיר</option><option>אלגנטי ומדויק</option></select></label></details>
        </> : null}
        {step === 1 ? <>
          <div className={styles.choices} role="group" aria-label="בחירת כיוון עיצובי">
            <button type="button" aria-pressed={designChoice === 'reference'} onClick={() => setDesignChoice('reference')}><b>יש לי עיצוב שאהבתי</b><span>העלאת צילום מסך כהשראה</span></button>
            <button type="button" aria-pressed={designChoice === 'style'} onClick={() => { setDesignChoice('style'); if (settings.referenceAssetId) removeImage(settings.referenceAssetId); }}><b>בחרו איתי סגנון</b><span>נקודת התחלה ללא תמונה</span></button>
          </div>
          {designChoice === 'reference' ? <>
            <label className={styles.check}><input type="checkbox" checked={referenceRights} onChange={event => setReferenceRights(event.target.checked)} />יש לי הרשאה להשתמש בתמונה לצורך השראה.</label>
            <div className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`} onPaste={pasteImage} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={dropImage} tabIndex={0} aria-label="העלאה, גרירה או הדבקה של צילום עיצוב">
              {reference?.url ? <img className={styles.referenceImage} src={reference.url} alt="דוגמת העיצוב — לא תמונה שתופיע באתר" /> : <div className={styles.imageIcon} aria-hidden="true">▧</div>}
              <b>{reference ? 'זו דוגמת העיצוב שלכם' : 'העלו או הדביקו צילום של אתר שאהבתם'}</b>
              <span>לעיצוב בלבד — צילום המסך והתמונות שבתוכו לא יוצגו באתר שלכם.</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="בחירת דוגמת עיצוב" onChange={event => { void upload(Array.from(event.target.files ?? []).slice(0, 1), 'reference'); event.target.value = ''; }} />
              <small>JPG, PNG או WebP · עד 4MB</small>
              {reference ? <button className={styles.textButton} type="button" onClick={() => removeImage(reference.id)}>הסרת הדוגמה</button> : null}
            </div>
            {reference && !settings.analysis ? <label className={styles.check}><input type="checkbox" checked={analyzeConsent} onChange={event => setAnalyzeConsent(event.target.checked)} />מאשר/ת לשלוח את התמונה ל־Google Gemini. בלחיצה על המשך ננתח את העיצוב. הניתוח משתמש בפעולת AI אחת ממכסת הבטא.</label> : null}
            {!reference ? <p className={styles.hint}>אין תמונה כרגע? בחרו סגנון מוכן למעלה, או המשיכו עם הסגנון הנקי.</p> : null}
          </> : null}
          {designChoice === 'style' ? <div className={styles.starters}>{([{ key: 'minimal', label: 'נקי ושקט', text: 'בהיר, פשוט ומרווח' }, { key: 'editorial', label: 'מגזיני ואישי', text: 'כותרות גדולות ותמונות מובילות' }, { key: 'bold', label: 'נועז ובולט', text: 'כהה, ניגודי ובעל נוכחות' }] as const).map(starter => <button key={starter.key} className={styles.starter} data-style={starter.key} aria-pressed={settings.starter === starter.key} type="button" onClick={() => updateSettings({ starter: starter.key })}><span className={styles.miniLayout} aria-hidden="true"><i /><i /><i /></span><b>{starter.label}</b><small>{starter.text}</small></button>)}</div> : null}
          {settings.analysis ? <div className={styles.analysis}><b>הכיוון שזיהינו</b><p>{settings.analysis.summary}</p><div className={styles.palette}>{palette.filter(color => /^#[a-f0-9]{6}$/i.test(color)).map((color, index) => <span key={index} style={{ backgroundColor: color }} title={color} aria-label={color} />)}</div></div> : null}
          <details className={styles.more}><summary>רוצים לדייק את הכיוון? — לא חובה</summary>
            <label className={styles.field}>מה לשמור, ומה לשנות?<textarea value={settings.notes} maxLength={1000} onChange={event => updateSettings({ notes: event.target.value })} placeholder="למשל: כותרת גדולה, פחות טקסט ויותר תמונות" /></label>
            {reference ? <label className={styles.field}>מה לקחת מהדוגמה?<select value={settings.referenceFocus} onChange={event => updateSettings({ referenceFocus: event.target.value as CreationSettings['referenceFocus'] })}><option value="both">המבנה והצבעים יחד</option><option value="structure">בעיקר המבנה</option><option value="colors">בעיקר הצבעים</option></select></label> : null}
            <div className={styles.grid}><label className={styles.field}>צבע מותג מדויק<input dir="ltr" value={settings.brandColor} maxLength={7} placeholder="#5145E5" onChange={event => updateSettings({ brandColor: event.target.value })} /></label>{input('העדפות צבע', 'colors', 'למשל: שמנת ושחור', 'text', 160)}</div>
          </details>
          <p className={styles.hint}>האתר יותאם לעסק ולעברית לפי אפשרויות העיצוב הנתמכות. זו השראה, לא העתק מדויק של צילום המסך.</p>
        </> : null}
        {step === 2 ? <>
          {settings.analysis ? <div className={styles.directionSummary}><b>הכיוון שלכם</b><p>{settings.analysis.summary}</p><button className={styles.textButton} type="button" onClick={() => void goTo(1)}>שינוי הכיוון</button></div> : null}
          <div className={styles.imageRoles}>
            {reference ? <div className={styles.referenceSummary}>{reference.url ? <img src={reference.url} alt="" /> : null}<div><b>דוגמת עיצוב</b><p>פרטית. לא תופיע באתר.</p></div></div> : null}
            <div className={styles.photoArea}><h3>התמונות שיופיעו באתר</h3><p className={styles.hint}>תמונות המוצרים, המקום או השירות שלכם. נבחר להן מיקום מתאים אוטומטית.</p>
              <label className={styles.check}><input type="checkbox" checked={rights} onChange={event => setRights(event.target.checked)} />יש לי הרשאה לפרסם את תמונות העסק שאעלה.</label>
              <label className={styles.uploadBusiness}><b>+ הוספת תמונות עסק</b><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={event => { void upload(Array.from(event.target.files ?? []), 'gallery'); event.target.value = ''; }} /><span>עד 6 קבצים כולל דוגמת העיצוב והלוגו · עד 4MB לקובץ ו־12MB בסך הכול</span></label>
              <div className={styles.photoGrid}>{photos.map(image => { const asset = assets.find(item => item.id === image.id); return <div key={image.id}>{asset?.url ? <img src={asset.url} alt={image.alt} /> : <span>התמונה נשמרה</span>}<span>{image.role === 'hero' ? 'תמונה ראשית' : 'תמונת עסק'}</span><button type="button" className={styles.textButton} onClick={() => removeImage(image.id)}>הסרה</button></div>; })}</div>
              {!photos.length ? <div className={styles.warning}><b>אין עדיין תמונות להצגה באתר</b><p>{reference ? 'התמונות שבתוך דוגמת העיצוב לא מועתקות לאתר. בלי תמונות עסק, הטיוטה תהיה מבוססת טקסט ותיראה שונה מדוגמה עשירה בצילום.' : 'אפשר ליצור טיוטה מבוססת טקסט ולהוסיף תמונות בהמשך.'}</p><label className={styles.check}><input type="checkbox" checked={withoutPhotos} onChange={event => setWithoutPhotos(event.target.checked)} />ליצור בלי תמונות עסק כרגע</label></div> : null}
            </div>
          </div>
          <details className={styles.more}><summary>{logo ? 'הלוגו שלכם — שינוי או הסרה' : 'יש לכם לוגו? הוסיפו אותו כאן — לא חובה'}</summary>{logo ? <div className={styles.logoPreview}><img src={assets.find(asset => asset.id === logo.id)?.url || ''} alt={logo.alt} /><button type="button" className={styles.textButton} onClick={() => removeImage(logo.id)}>הסרת הלוגו</button></div> : null}<input type="file" aria-label="העלאת לוגו" accept="image/jpeg,image/png,image/webp" onChange={event => { void upload(Array.from(event.target.files ?? []).slice(0, 1), 'logo'); event.target.value = ''; }} /></details>
          <h3>איך יצרו אתכם קשר?</h3>
          <div className={styles.grid}><label className={styles.field}>הדרך המועדפת<select value={settings.contactPreference} onChange={event => updateSettings({ contactPreference: event.target.value as CreationSettings['contactPreference'] })}><option value="whatsapp">WhatsApp</option><option value="phone">טלפון</option><option value="email">אימייל</option><option value="form">טופס פנייה</option></select></label>{['phone', 'whatsapp'].includes(settings.contactPreference) ? input('הטלפון שיופיע באתר', 'contactPhone', '0501234567', 'tel', 40) : settings.contactPreference === 'email' ? input('האימייל שיופיע באתר', 'contactEmail', 'hello@business.co.il', 'email', 254) : <p className={styles.hint}>הפניות יופיעו באזור האישי אחרי פרסום האתר. ללא הזמנות או תשלומים.</p>}</div>
          {(!brief.contactPhone && ['phone', 'whatsapp'].includes(settings.contactPreference)) || (!brief.contactEmail && settings.contactPreference === 'email') ? <p className={styles.warning}>הוסיפו את פרט הקשר שבחרתם. בינתיים אפשר ליצור טיוטה פרטית ולתקן לפני הפרסום.</p> : null}
          <details className={styles.more}><summary>עוד תוכן וקישורים — לא חובה</summary><label className={styles.field}>מה עוד חשוב שיופיע?<textarea value={brief.websiteCopy} maxLength={4000} onChange={event => updateBrief('websiteCopy', event.target.value)} placeholder="שעות פעילות, שירותים, שאלות נפוצות או המלצות אמיתיות…" /></label>{input('קישורים לעסק', 'importantLinks', 'Instagram, Google Maps…', 'text', 1200)}{input('טלפון נוסף / שמור', 'contactPhone', '', 'tel', 40)}{input('אימייל נוסף / שמור', 'contactEmail', '', 'email', 254)}</details>
          <div className={styles.notice}><b>השלב הבא: רואים את האתר שלכם</b><p>ניצור טיוטה פרטית ונפתח אותה אוטומטית. תוכלו לשנות טקסט, תמונות ועיצוב לפני הפרסום.</p></div>
          <label className={styles.check}><input type="checkbox" checked={aiConsent} onChange={event => setAiConsent(event.target.checked)} />מאשר/ת לשלוח ל־Google Gemini את פרטי העסק והתמונות שנבחרו ליצירת האתר. לא כללתי מידע רגיש. היצירה משתמשת בפעולת AI אחת ממכסת הבטא.</label>
        </> : null}
        {(step === 1 || step === 2) && availableAssets.some(asset => (step === 1) === asset.storage_path.includes('/reference/')) ? <details className={styles.more}><summary>תמונות שכבר העליתם</summary><div className={styles.library}>{availableAssets.filter(asset => (step === 1) === asset.storage_path.includes('/reference/')).map(asset => <button key={asset.id} type="button" onClick={() => { addExisting(asset); if (step === 1) setDesignChoice('reference'); }}>{asset.url ? <img src={asset.url} alt="" /> : null}<span>{asset.original_name}</span><small>הוספה +</small></button>)}</div></details> : null}
      </fieldset>
      {busy ? <p className={styles.busy} role="status">{({ upload: 'מעלים ושומרים את התמונות…', analyze: 'לומדים את המבנה, הצבעים והאווירה של הדוגמה…', generate: 'מכינים את יצירת האתר…', save: 'שומרים את הפרטים…' } as Record<string, string>)[busy]}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {!ready && error && !existingId ? <button type="button" className={styles.secondary} onClick={() => { try { localStorage.removeItem(storageKey); } catch { /* no-op */ } id.current = ''; saved.current = ''; setBrief(emptyBrief); setSettings(defaultCreationSettings()); setAssets([]); setStep(0); setResumed(false); setError(''); setReady(true); }}>התחלת טיוטה חדשה בלי למחוק את הישנה</button> : null}
      <div className={styles.actions}><button type="button" className={styles.primary} disabled={!ready || !!busy || (step === 2 && !aiConsent)} onClick={() => void (step === 2 ? finish(true) : goTo(step + 1))}>{step === 2 ? 'יצירת האתר שלי ←' : step === 1 && reference && !settings.analysis ? 'המשך — נתאים את העיצוב ←' : 'המשך ←'}</button>{step > 0 ? <button type="button" className={styles.secondary} disabled={!ready || !!busy} onClick={() => void goTo(step - 1)}>חזרה</button> : null}<button className={styles.saveExit} type="button" disabled={!ready || !!busy || brief.businessName.trim().length < 2} onClick={() => void finish(false)}>{existingId ? 'שמירה וחזרה לפרויקט' : 'המשך אחר כך'}</button></div>
    </section>
  </div>;
}
