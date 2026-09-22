'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { defaultCreationSettings, type CreationSettings, type CreationImage, type FocalPoint } from '@/lib/creation/types';
import styles from './creation-wizard.module.css';

export type CreationBrief = {
  businessName: string; businessType: string; location: string; businessStory: string;
  primaryGoal: string; websiteCopy: string; importantLinks: string; tone: string;
  colors: string; contactEmail: string; contactPhone: string; designNotes: string; designUrl: string;
};
type Asset = { id: string; original_name: string; mime_type: string; size_bytes: number; storage_path: string; url?: string | null };
type Props = { userId: string; projectId?: string; initialBrief?: CreationBrief };
const emptyBrief: CreationBrief = { businessName: '', businessType: '', location: '', businessStory: '', primaryGoal: '', websiteCopy: '', importantLinks: '', tone: '', colors: '', contactEmail: '', contactPhone: '', designNotes: '', designUrl: '' };
const steps = ['העסק שלך', 'הכיוון העיצובי', 'התמונות והתוכן', 'בדיקה ויצירה'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const defaultFocal: FocalPoint = { x: 50, y: 50, mobileX: 50, mobileY: 50 };

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
  const [aiConsent, setAiConsent] = useState(false);
  const [analyzeConsent, setAnalyzeConsent] = useState(false);
  const [cropMode, setCropMode] = useState<'desktop' | 'mobile'>('desktop');
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
            setBrief(restoredBrief); setStep(Math.max(0, Math.min(3, Number(cached.step) || 0))); setResumed(true);
          }
        }
        if (id.current) {
          const [config, media] = await Promise.all([
            jsonRequest(`/api/projects/${id.current}/creation`),
            jsonRequest(`/api/projects/${id.current}/assets`),
          ]);
          if (cancelled) return;
          setSettings(config.settings ?? defaultCreationSettings()); setAssets(media.assets ?? []);
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

  function updateBrief(key: keyof CreationBrief, value: string) { setBrief(previous => ({ ...previous, [key]: value })); }
  function updateSettings(patch: Partial<CreationSettings>) { setSettings(previous => ({ ...previous, ...patch })); }
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
    if (!ready || busy) return;
    setError('');
    try { await saveDraft(); setStep(next); requestAnimationFrame(() => heading.current?.focus()); }
    catch (e) { setError(e instanceof Error ? e.message : 'לא הצלחנו לשמור.'); }
  }

  async function upload(files: File[], role: CreationImage['role']) {
    if (!files.length || busy || !ready) return;
    setError('');
    if (!rights) { setError('לפני ההעלאה, אשרו שיש לכם הרשאה להשתמש בתמונות.'); return; }
    const selected = settings.images.filter(image => role !== 'reference' || image.role !== 'reference');
    const bytes = selected.reduce((total, image) => total + (assets.find(asset => asset.id === image.id)?.size_bytes ?? 0), 0);
    if (selected.length + files.length > 6 || files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) || files.reduce((total, file) => total + file.size, bytes) > 12 * 1024 * 1024) {
      setError('בחרו עד 6 תמונות בסך הכול, JPG / PNG / WebP עד 4MB לתמונה ועד 12MB לכל הבחירה.'); return;
    }
    setBusy('upload');
    try {
      const project = await saveDraft();
      let nextSettings = { ...latest.current.settings, images: [...selected] };
      for (const file of files) {
        const form = new FormData(); form.set('file', file); form.set('role', role); form.set('alt', role === 'reference' ? 'תמונת השראה לעיצוב' : file.name.replace(/\.[^.]+$/, '').slice(0, 180) || 'תמונת העסק');
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
    finally { setBusy(''); }
  }

  async function analyze() {
    if (!analyzeConsent) { setError('אשרו שליחה של תמונת ההשראה ל־Gemini לצורך הניתוח.'); return; }
    setBusy('analyze'); setError('');
    try {
      const project = await saveDraft();
      const result = await jsonRequest(`/api/projects/${project}/analyze`, writeRequest('POST', { requestId: crypto.randomUUID(), consent: true }));
      setSettings(result.settings); latest.current = { ...latest.current, settings: result.settings };
      saved.current = JSON.stringify(latest.current); setSaveState('ניתוח ההשראה נשמר');
    } catch (e) { setError(e instanceof Error ? e.message : 'לא הצלחנו לנתח את ההשראה.'); }
    finally { setBusy(''); }
  }

  async function finish(generate: boolean) {
    if (generate && !aiConsent) { setError('אשרו את שליחת התוכן והתמונות שנבחרו ל־Gemini.'); return; }
    if (generate && ![brief.businessStory, brief.websiteCopy, brief.primaryGoal].some(value => value.trim())) { setError('ספרו לפחות משפט אחד על העסק כדי שניצור תוכן אמיתי ורלוונטי.'); setStep(0); return; }
    setBusy(generate ? 'generate' : 'save'); setError('');
    try {
      const project = await saveDraft();
      if (generate) await jsonRequest(`/api/projects/${project}/generate`, writeRequest('POST', { requestId: crypto.randomUUID(), consent: true }));
      try { localStorage.removeItem(storageKey); } catch { /* no-op */ }
      router.replace(`/dashboard/projects/${project}`); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'לא הצלחנו להמשיך.'); setBusy(''); }
  }

  const reference = assets.find(asset => asset.id === settings.referenceAssetId);
  const businessImages = settings.images.filter(image => image.role !== 'reference');
  const palette = settings.analysis?.palette ?? [];
  function removeImage(imageId: string) {
    updateSettings({ images: settings.images.filter(image => image.id !== imageId), ...(settings.referenceAssetId === imageId ? { referenceAssetId: null, analysis: undefined } : {}) });
  }
  function editImage(imageId: string, patch: Partial<CreationImage>) {
    let next = settings.images.map(image => image.id === imageId ? { ...image, ...patch } : image);
    if (patch.role === 'hero' || patch.role === 'logo') next = next.map(image => image.id !== imageId && image.role === patch.role ? { ...image, role: 'gallery' } : image);
    updateSettings({ images: next });
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
    <div className={styles.topline}><span className={styles.badge}>האתר שלך, בדרך שלך</span><span className={styles.saveStatus} role="status">{!ready && !error ? 'טוענים את הטיוטה…' : saveState || 'הטיוטה תישמר אוטומטית אחרי הוספת שם העסק'}</span></div>
    {resumed ? <p className={styles.resume}>ממשיכים מאיפה שעצרתם. הטיוטה והבחירות השמורות כאן.</p> : null}
    <nav aria-label="שלבי יצירת האתר"><ol className={styles.steps}>{steps.map((name, index) => <li key={name}><button type="button" aria-current={step === index ? 'step' : undefined} disabled={!ready || !!busy} onClick={() => void goTo(index)}><span>{index + 1}</span><b>{name}</b></button></li>)}</ol></nav>
    <div className={styles.content}>
      <section className={styles.main} aria-labelledby="creation-step-heading">
        <div className={styles.sectionHeading}><span>שלב {step + 1} מתוך 4</span><h2 id="creation-step-heading" tabIndex={-1} ref={heading}>{['קודם, נכיר את העסק.', 'תמונה אחת. כיוון ברור.', 'החומרים שעושים את זה שלכם.', 'נראה טוב? יוצרים.'][step]}</h2><p>{['כמה פרטים אמיתיים, וה־AI יעזור לחבר אותם לאתר. אפשר לעדכן הכול גם בהמשך.', 'העלו צילום של עיצוב שאהבתם. נלמד את המבנה והאופי, לא נפרסם את צילום ההשראה.', 'הלוגו, התמונות והטקסטים שלכם — בנפרד מההשראה העיצובית.', 'ניצור טיוטה פרטית לבדיקה במחשב ובנייד. רק אתם מחליטים מתי לפרסם.'][step]}</p></div>
        <fieldset className={styles.fields} disabled={!ready || !!busy}>
          {step === 0 ? <>
            <div className={styles.grid}>{input('שם העסק *', 'businessName', 'איך קוראים לעסק?')}{input('תחום העסק', 'businessType', 'למשל: סטודיו לשיער')}{input('אזור הפעילות', 'location', 'עיר, אזור או שירות אונליין')}<label className={styles.field}>איך תרצו שיצרו קשר?<select value={settings.contactPreference} onChange={event => updateSettings({ contactPreference: event.target.value as CreationSettings['contactPreference'] })}><option value="whatsapp">WhatsApp</option><option value="phone">טלפון</option><option value="email">אימייל</option><option value="form">טופס יצירת קשר</option></select></label>{input('טלפון שיופיע באתר', 'contactPhone', '0501234567', 'tel', 40)}{input('אימייל שיופיע באתר', 'contactEmail', 'hello@business.co.il', 'email', 254)}</div>
            <label className={styles.field}>הסיפור והשירותים שלכם<textarea value={brief.businessStory} maxLength={2500} onChange={event => updateBrief('businessStory', event.target.value)} placeholder={helpfulQuestion(brief.businessType)} /><small>{helpfulQuestion(brief.businessType)} אנחנו לא ממציאים ניסיון, לקוחות או המלצות.</small></label>
            <details className={styles.more}><summary>עוד קצת על מטרת האתר וסגנון הכתיבה</summary>{input('מה חשוב למבקרים לדעת או לעשות?', 'primaryGoal', 'למשל: להכיר את השירותים ולפנות להתייעצות', 'text', 500)}<label className={styles.field}>סגנון הכתיבה<select value={brief.tone} onChange={event => updateBrief('tone', event.target.value)}><option value="">התאמה לסיפור של העסק</option><option>נקי ומקצועי</option><option>חם ואישי</option><option>נועז וישיר</option><option>אלגנטי ומדויק</option></select></label></details>
          </> : null}
          {step === 1 ? <>
            <label className={styles.check}><input type="checkbox" checked={rights} onChange={event => setRights(event.target.checked)} />יש לי הרשאה להשתמש בתמונות שאעלה לצורך השראה או פרסום, לפי התפקיד שלהן.</label>
            <div className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`} onPaste={pasteImage} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={dropImage} tabIndex={0} aria-label="העלאה, גרירה או הדבקה של תמונת השראה">
              {reference?.url ? <img className={styles.referenceImage} src={reference.url} alt="תמונת ההשראה הפרטית שלכם" /> : <div className={styles.imageIcon} aria-hidden="true">▧</div>}
              <b>{reference ? 'תמונת ההשראה שלכם' : 'גררו תמונה, הדביקו או בחרו קובץ'}</b><span>JPG, PNG או WebP · עד 4MB · צילום מסך ברור של עמוד או אזור עיצוב</span><input type="file" accept="image/jpeg,image/png,image/webp" aria-label={reference ? 'החלפת תמונת השראה' : 'בחירת תמונת השראה'} onChange={event => { void upload(Array.from(event.target.files ?? []).slice(0, 1), 'reference'); event.target.value = ''; }} />
              {reference ? <button className={styles.textButton} type="button" onClick={() => removeImage(reference.id)}>הסרת ההשראה מהבחירה</button> : null}
            </div>
            {reference ? <><label className={styles.field}>מה אהבתם בתמונה?<select value={settings.referenceFocus} onChange={event => updateSettings({ referenceFocus: event.target.value as CreationSettings['referenceFocus'] })}><option value="both">המבנה והצבעים יחד</option><option value="structure">בעיקר המבנה והקומפוזיציה</option><option value="colors">בעיקר הצבעים והאווירה</option></select></label><label className={styles.check}><input type="checkbox" checked={analyzeConsent} onChange={event => setAnalyzeConsent(event.target.checked)} />אני מסכים/ה לשליחת תמונת ההשראה ל־Gemini לניתוח עיצובי. אין להעלות מידע רגיש.</label><button type="button" className={styles.secondary} onClick={() => void analyze()} disabled={!analyzeConsent}>{settings.analysis ? 'ניתוח ההשראה מחדש' : 'מה ה־AI מזהה בתמונה?'}</button><small className={styles.hint}>הניתוח משתמש במכסת פעולות ה־AI, ולא יוצר אתר עדיין.</small></> : null}{!reference || settings.referenceFocus === 'colors' ? <div className={styles.starterSection}><h3>{reference ? 'לצבעים מההשראה, בוחרים מבנה משלכם.' : 'אין תמונה? בוחרים נקודת התחלה.'}</h3><div className={styles.starters}>{([{ key: 'minimal', label: 'נקי ושקט', text: 'מרווח, בהיר ומדויק' }, { key: 'editorial', label: 'מגזיני ואישי', text: 'טיפוגרפיה ותמונות מובילות' }, { key: 'bold', label: 'נועז ובולט', text: 'ניגודיות ונוכחות' }] as const).map(starter => <button key={starter.key} className={styles.starter} data-style={starter.key} aria-pressed={settings.starter === starter.key} type="button" onClick={() => updateSettings({ starter: starter.key })}><span className={styles.miniLayout} aria-hidden="true"><i /><i /><i /></span><b>{starter.label}</b><small>{starter.text}</small></button>)}</div></div> : null}
            {settings.analysis ? <div className={styles.analysis}><span className={styles.badge}>זה הכיוון שזוהה</span><p>{settings.analysis.summary}</p><ul>{settings.analysis.features.map((feature, index) => <li key={`${feature}-${index}`}>{feature}</li>)}</ul><div className={styles.palette}>{palette.filter(color => /^#[a-f0-9]{6}$/i.test(color)).map((color, index) => <span key={`${color}-${index}`} style={{ backgroundColor: color }} title={color} aria-label={`צבע ${color}`} />)}</div><small>זו פרשנות עיצובית לתמונה, לא הבטחה להעתקה מדויקת. תוכלו לדייק בהנחיות ובהמשך בתצוגה המקדימה.</small></div> : null}
            <label className={styles.field}>מה לשמור, ומה לעשות אחרת?<textarea value={settings.notes} maxLength={1000} onChange={event => updateSettings({ notes: event.target.value })} placeholder="למשל: להשאיר את הכותרת הגדולה והמרווחים, אבל להשתמש בצבעי המותג שלי" /></label>
            <div className={styles.grid}><label className={styles.field}>צבע מותג מדויק — לא חובה<input dir="ltr" value={settings.brandColor} maxLength={7} placeholder="#5145E5" onChange={event => updateSettings({ brandColor: event.target.value })} /><small>קוד צבע במבנה #RRGGBB. נתאים ניגודיות לקריאות.</small></label>{input('העדפות צבע נוספות', 'colors', 'למשל: שמנת ושחור, בלי ורוד', 'text', 160)}</div>
          </> : null}
          {step === 2 ? <>
            <div className={styles.notice}>תמונת ההשראה נשארת פרטית. רק תמונות העסק שתבחרו כאן יכולות להופיע באתר.</div>
            <label className={styles.check}><input type="checkbox" checked={rights} onChange={event => setRights(event.target.checked)} />יש לי הרשאה להשתמש ולפרסם את תמונות העסק שאעלה.</label>
            <label className={styles.uploadBusiness}><b>הוספת תמונות עסק ולוגו</b><span>עד 6 תמונות כולל ההשראה, 4MB לתמונה חדשה ועד 12MB לבחירה</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={event => { void upload(Array.from(event.target.files ?? []), 'gallery'); event.target.value = ''; }} /></label>
            {businessImages.length ? <><div className={styles.cropToggle} role="group" aria-label="תצוגת חיתוך"><span>התאמת מיקום בתמונה:</span><button type="button" aria-pressed={cropMode === 'desktop'} onClick={() => setCropMode('desktop')}>מחשב</button><button type="button" aria-pressed={cropMode === 'mobile'} onClick={() => setCropMode('mobile')}>נייד</button></div><div className={styles.assets}>{businessImages.map(image => {
              const asset = assets.find(item => item.id === image.id); const focal = image.focalPoint ?? defaultFocal;
              const xKey = cropMode === 'desktop' ? 'x' : 'mobileX'; const yKey = cropMode === 'desktop' ? 'y' : 'mobileY';
              return <div className={styles.asset} key={image.id}><div className={styles.assetPreview} data-mobile={cropMode === 'mobile'}>{asset?.url ? <img src={asset.url} alt={image.alt} style={{ objectFit: image.role === 'logo' ? 'contain' : 'cover', objectPosition: `${focal[xKey]}% ${focal[yKey]}%` }} /> : <span>תצוגה לא זמינה</span>}</div><div className={styles.assetFields}><label className={styles.field}>תפקיד בתוצאה<select value={image.role} onChange={event => editImage(image.id, { role: event.target.value as CreationImage['role'] })}><option value="gallery">גלריה / תמונת שירות</option><option value="hero">תמונה ראשית</option><option value="logo">לוגו</option></select></label><label className={styles.field}>מה רואים בתמונה?<input maxLength={180} value={image.alt} onChange={event => editImage(image.id, { alt: event.target.value })} placeholder="תיאור קצר ונגיש של התמונה" /></label>{image.role !== 'logo' ? <details className={styles.crop}><summary>מיקום התמונה ב{cropMode === 'mobile' ? 'נייד' : 'מחשב'}</summary><label>ימינה / שמאלה<input type="range" min={0} max={100} value={focal[xKey]} onChange={event => editImage(image.id, { focalPoint: { ...focal, [xKey]: Number(event.target.value) } })} /></label><label>למעלה / למטה<input type="range" min={0} max={100} value={focal[yKey]} onChange={event => editImage(image.id, { focalPoint: { ...focal, [yKey]: Number(event.target.value) } })} /></label></details> : null}<button className={styles.textButton} type="button" onClick={() => removeImage(image.id)}>הסרה מהבחירה</button></div></div>;
            })}</div></> : <p className={styles.hint}>אפשר להמשיך גם ללא תמונות. תמונה אמיתית וברורה של העסק בדרך כלל מספרת יותר מתמונה כללית.</p>}
            <label className={styles.field}>פרטים וטקסטים שחייבים להופיע<textarea value={brief.websiteCopy} maxLength={4000} onChange={event => updateBrief('websiteCopy', event.target.value)} placeholder="שירותים, שעות פעילות, שאלות נפוצות, המלצות אמיתיות שברשותכם…" /><small>כתבו רק מידע אמיתי. אפשר להשאיר ריק ולעדכן בהמשך.</small></label>{input('קישורים לעסק', 'importantLinks', 'Instagram, Google Maps או קישור נוסף שחשוב להציג', 'text', 1200)}
          </> : null}
          {(step === 1 || step === 2) && availableAssets.some(asset => (step === 1) === asset.storage_path.includes('/reference/')) ? <details className={styles.more}><summary>בחירה מתמונות שכבר שמורות בפרויקט</summary><div className={styles.library}>{availableAssets.filter(asset => (step === 1) === asset.storage_path.includes('/reference/')).map(asset => <button key={asset.id} type="button" onClick={() => addExisting(asset)}>{asset.url ? <img src={asset.url} alt="" /> : null}<span>{asset.original_name}</span><small>הוספה לבחירה +</small></button>)}</div></details> : null}
          {step === 3 ? <>
            <div className={styles.reviewHero}><div><span>הטיוטה הבאה שלכם</span><h3>{brief.businessName || 'העסק שלכם'}</h3><p>{brief.businessType || 'אתר תדמית'}{brief.location ? ` · ${brief.location}` : ''}</p></div><span className={styles.privateBadge}>פרטי · לא מפורסם</span></div>
            <dl className={styles.reviewList}><div><dt>הכיוון</dt><dd>{settings.analysis?.summary || (reference ? 'תמונת ההשראה וההנחיות שלכם' : { minimal: 'נקי ושקט', editorial: 'מגזיני ואישי', bold: 'נועז ובולט' }[settings.starter])}<button type="button" onClick={() => void goTo(1)}>עדכון</button></dd></div><div><dt>חומרי העסק</dt><dd>{businessImages.length} תמונות נבחרו{reference ? ' + תמונת השראה פרטית' : ''}<button type="button" onClick={() => void goTo(2)}>עדכון</button></dd></div><div><dt>יצירת קשר</dt><dd>{{ whatsapp: 'WhatsApp', phone: 'טלפון', email: 'אימייל', form: 'טופס יצירת קשר' }[settings.contactPreference]}<button type="button" onClick={() => void goTo(0)}>עדכון</button></dd></div></dl>
            {(!brief.contactPhone && ['phone', 'whatsapp'].includes(settings.contactPreference)) || (!brief.contactEmail && settings.contactPreference === 'email') ? <p className={styles.warning}>חסר פרט לדרך יצירת הקשר שבחרתם. הוסיפו אותו בשלב העסק לפני הפרסום.</p> : null}
            {settings.referenceAssetId && !settings.analysis ? <p className={styles.hint}>טרם ניתחתם את ההשראה בנפרד. אפשר לעשות זאת בשלב העיצוב, או לתת ליצירה להתבסס ישירות על התמונה.</p> : null}
            <div className={styles.notice}><b>מה יקרה עכשיו?</b><p>נכין עמוד אחד עם טקסט, עיצוב ותמונות. תוכלו להשוות, לשנות אזור מסוים ולחזור לגרסה קודמת. לא נוסיף הזמנות או תשלומים.</p></div>
            <label className={styles.check}><input type="checkbox" checked={aiConsent} onChange={event => setAiConsent(event.target.checked)} />אני מאשר/ת לשלוח ל־Gemini את פרטי העסק, ההנחיות והתמונות שנבחרו לצורך יצירת האתר. לא כלול מידע רגיש.</label>
          </> : null}
        </fieldset>
        {busy ? <p className={styles.busy} role="status">{({ upload: 'מעלים ושומרים את התמונות…', analyze: 'מנתחים את המבנה, הצבעים והאווירה… זה עשוי לקחת רגע.', generate: 'שומרים את הבחירות ומתחילים ליצור…', save: 'שומרים וחוזרים לפרויקט…' } as Record<string, string>)[busy]}</p> : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {!ready && error && !existingId ? <button type="button" className={styles.secondary} onClick={() => { try { localStorage.removeItem(storageKey); } catch { /* no-op */ } id.current = ''; saved.current = ''; setBrief(emptyBrief); setSettings(defaultCreationSettings()); setAssets([]); setStep(0); setResumed(false); setError(''); setReady(true); }}>התחלת טיוטה חדשה בלי למחוק את הישנה</button> : null}
        <div className={styles.actions}><button type="button" className={styles.primary} disabled={!ready || !!busy || (step === 3 && !aiConsent)} onClick={() => void (step === 3 ? finish(true) : goTo(step + 1))}>{step === 3 ? 'יצירת טיוטת האתר עם AI ←' : `${steps[step + 1]} ←`}</button>{step > 0 ? <button type="button" className={styles.secondary} disabled={!ready || !!busy} onClick={() => void goTo(step - 1)}>חזרה</button> : null}<button className={styles.saveExit} type="button" disabled={!ready || !!busy || brief.businessName.trim().length < 2} onClick={() => void finish(false)}>{existingId ? 'שמירה וחזרה לפרויקט' : 'שמירה והמשך אחר כך'}</button></div>
      </section>
      <aside className={styles.side} aria-label="סיכום הכיוון שלכם"><span className={styles.eyebrow}>YOUR NEXT WEBSITE</span><h2>לא עוד אתר<br />שנראה כמו כולם.</h2><p>העסק שלכם קובע את התוכן.<br />ההשראה שלכם מכוונת את העיצוב.</p><div className={styles.directionCard}>{reference?.url ? <img src={reference.url} alt="ההשראה שנבחרה לעיצוב, לא תופיע באתר" /> : <div className={styles.directionPlaceholder} data-starter={settings.starter}><span>{brief.businessName || 'הסיפור שלכם.'}</span><i /><i /><b /></div>}<div><b>{brief.businessName || 'כאן מתחיל האתר שלכם'}</b><small>{reference ? 'השראה פרטית · לא תמונת עסק' : 'כיוון ראשוני, לא תצוגה של האתר הסופי'}</small></div></div><ul className={styles.sideList}><li><span>01</span>תמונה במקום הסברים ארוכים</li><li><span>02</span>התאמה למחשב ולנייד</li><li><span>03</span>פרסום רק כשאתם מוכנים</li></ul><p className={styles.sideNote}>טיפ: צילום מסך חד של העיצוב עוזר יותר מקולאז׳ עם כמה עיצובים קטנים.</p></aside>
    </div>
  </div>;
}
