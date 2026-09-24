'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteRenderer } from '@/components/sites/site-renderer';
import { PreviewViewport } from './preview-viewport';
import { focalPointFor, themeFor, launchChecks, type GeneratedSitePlan, type SiteImage, type SiteSection } from '@/lib/sites/document';
import { revisionLockError } from '@/lib/sites/revision-locks';
import type { CreationSettings, FocalPoint } from '@/lib/creation/types';
import styles from './site-workbench.module.css';

type Version = { id: string; version_number: number; created_at: string; visibility: string };
type Candidate = { id: string; plan: GeneratedSitePlan; label: string };
type Change = (values: Record<string, unknown>, label?: string) => Promise<void>;

function FocalEditor({ image, projectId, versionId, disabled, change }: { image: SiteImage; projectId: string; versionId: string; disabled: boolean; change: Change }) {
  const [focal, setFocal] = useState<FocalPoint>(() => focalPointFor(image));
  const source = `/api/sites/${projectId}/media/${versionId}/${image.id}`;
  return <form className={styles.focalEditor} onSubmit={event => { event.preventDefault(); void change({ mode: 'image', imageId: image.id, focalPoint: focal }, 'מיקוד התמונה'); }}>
    <h4>{image.alt || 'תמונה מהעסק'}</h4>
    <div className={styles.focalPreviews}>
      <figure><figcaption>מחשב</figcaption><img src={source} alt={image.alt} style={{ objectPosition: `${focal.x}% ${focal.y}%` }} /></figure>
      <figure data-mobile="true"><figcaption>מובייל</figcaption><img src={source} alt={image.alt} style={{ objectPosition: `${focal.mobileX}% ${focal.mobileY}%` }} /></figure>
    </div>
    <div className={styles.focalControls}>{([['x', 'מחשב · ימין ושמאל'], ['y', 'מחשב · למעלה ולמטה'], ['mobileX', 'מובייל · ימין ושמאל'], ['mobileY', 'מובייל · למעלה ולמטה']] as const).map(([key, label]) => <label className="field" key={key}>{label}<input type="range" min="0" max="100" step="1" dir="ltr" value={focal[key]} disabled={disabled} onChange={event => setFocal(current => ({ ...current, [key]: Number(event.target.value) }))} /><small>{focal[key]}%</small></label>)}</div>
    <p className={styles.note}>המחשה לחיתוך בלבד. בדקו את מיקום התמונה גם בתצוגת האתר בכל רוחב.</p>
    <button className="secondary-button" disabled={disabled}>הצגת המיקוד החדש</button>
  </form>;
}

export function SiteWorkbench({ projectId, versionId, plan, versions, curated = false, initialEditTab }: { projectId: string; versionId: string; plan: GeneratedSitePlan; versions: Version[]; curated?: boolean; initialEditTab?: 'text' | 'design' }) {
  const router = useRouter();
  const [selected, setSelected] = useState('site-header');
  const [editTab, setEditTab] = useState<'text' | 'design'>(initialEditTab ?? 'text');
  const [editorOpen, setEditorOpen] = useState(Boolean(initialEditTab));
  useEffect(() => { if (initialEditTab) { setEditTab(initialEditTab); setEditorOpen(true); } }, [initialEditTab]);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [restoreId, setRestoreId] = useState('');
  const [settings, setSettings] = useState<CreationSettings | null>(null);
  const [settingsError, setSettingsError] = useState('');
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [referenceFailed, setReferenceFailed] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState('');
  const requestAttempt = useRef<{ key: string; id: string } | null>(null);
  const settingsRequest = useRef(0);
  const reviewPanel = useRef<HTMLElement | null>(null);

  async function loadSettings() {
    const attempt = ++settingsRequest.current;
    setSettingsBusy(true);
    setSettingsError('');
    try {
      const response = await fetch(`/api/projects/${projectId}/creation`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.settings) throw new Error(data.error || 'לא הצלחנו לטעון את הגדרות העריכה.');
      if (attempt === settingsRequest.current) {
        setSettings(data.settings);
        setReferenceFailed(false);
        setReferenceUrl('');
        if (data.settings.referenceAssetId) {
          try {
            const assetsResponse = await fetch(`/api/projects/${projectId}/assets`, { cache: 'no-store' });
            const assetsData = await assetsResponse.json();
            const reference = assetsData.assets?.find((asset: { id: string; url?: string | null }) => asset.id === data.settings.referenceAssetId);
            if (attempt === settingsRequest.current) {
              setReferenceUrl(reference?.url || '');
              setReferenceFailed(!assetsResponse.ok || !reference?.url);
            }
          } catch { if (attempt === settingsRequest.current) setReferenceFailed(true); }
        }
      }
    } catch (failure) {
      if (attempt === settingsRequest.current) setSettingsError(failure instanceof Error ? failure.message : 'לא הצלחנו לטעון את הגדרות העריכה.');
    } finally {
      if (attempt === settingsRequest.current) setSettingsBusy(false);
    }
  }

  useEffect(() => {
    void loadSettings();
    return () => { settingsRequest.current++; };
    // The parent remounts the workbench when the saved version changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!candidate) return;
    reviewPanel.current?.focus({ preventScroll: true });
    reviewPanel.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [candidate]);

  async function toggleLock(key: 'design' | 'text') {
    if (!settings || settingsBusy) return;
    setSettingsBusy(true);
    setSettingsError('');
    try {
      const currentResponse = await fetch(`/api/projects/${projectId}/creation`, { cache: 'no-store' });
      const current = await currentResponse.json();
      if (!currentResponse.ok || !current.settings) throw new Error(current.error || 'לא הצלחנו לטעון את הנעילות.');
      const next: CreationSettings = { ...current.settings, locks: { ...current.settings.locks, [key]: !settings.locks[key] } };
      const response = await fetch(`/api/projects/${projectId}/creation`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locks: next.locks }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'לא הצלחנו לשמור את הנעילה.');
      setSettings(data.settings ?? next);
      setMessage(next.locks[key] ? `${key === 'design' ? 'העיצוב' : 'התוכן'} ננעל. אפשר לבטל את הנעילה כאן בכל עת.` : 'הנעילה בוטלה. אפשר להמשיך בעריכה.');
    } catch (failure) {
      setSettingsError(failure instanceof Error ? failure.message : 'לא הצלחנו לשמור את הנעילה.');
    } finally { setSettingsBusy(false); }
  }

  const change: Change = async (values, label = 'השינוי שביקשתם') => {
    setBusy(true); setError(''); setMessage('');
    try {
      const key = JSON.stringify({ values, versionId });
      if (requestAttempt.current?.key !== key) requestAttempt.current = { key, id: crypto.randomUUID() };
      const response = await fetch(`/api/projects/${projectId}/revisions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, baseVersionId: versionId, requestId: requestAttempt.current.id }) });
      const data = await response.json();
      requestAttempt.current = null;
      if (!response.ok) throw new Error(data.error || 'לא הצלחנו לשמור את השינוי.');
      if (data.proposal && data.plan) {
        setCandidate({ id: data.versionId, plan: data.plan, label });
        setShowOriginal(false);
        setMessage('ההצעה מוכנה בתצוגה המקדימה. בדקו אותה ואשרו כדי לשמור טיוטה.');
      } else {
        setCandidate(null);
        setMessage('נשמרה טיוטה חדשה. אפשר לחזור לגרסה קודמת דרך היסטוריית הגרסאות.');
        router.refresh();
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'אירעה שגיאה.'); }
    finally { setBusy(false); }
  };

  const editingHeader = selected === 'site-header';
  const theme = themeFor(plan);
  const section: SiteSection = editingHeader ? {
    id: 'site-header', kind: 'hero', label: 'פתיחת האתר', headline: plan.siteTitle, body: plan.positioning, cta: plan.contactCta,
    imageId: plan.heroImageId === null ? undefined : plan.heroImageId ?? plan.images?.find(image => image.role === 'hero')?.id ?? plan.images?.find(image => image.role === 'gallery')?.id,
  } : plan.sections.find(item => item.id === selected) ?? plan.sections[0];
  const images = (plan.images ?? []).filter(image => ['hero', 'gallery', 'logo'].includes(image.role));
  const shown = candidate && !showOriginal ? candidate.plan : plan;
  const shownVersion = candidate && !showOriginal ? candidate.id : versionId;
  const disabled = busy || settingsBusy || !settings;
  const textDisabled = disabled || Boolean(settings?.locks.text);
  const designDisabled = disabled || Boolean(settings?.locks.design);
  const candidateLock = candidate && settings ? revisionLockError(plan, candidate.plan, settings.locks) : null;
  const savedVersions = versions.filter(version => version.visibility !== 'preview');
  const previousVersion = savedVersions.find(version => version.id !== versionId);
  const checks = launchChecks(shown);

  return <div className={`site-workbench ${styles.workbench}`}>
    {message ? <p className="success-message" role="status">{message}</p> : null}
    {error ? <p className="error-message" role="alert">{error}</p> : null}
    {settingsError ? <div className="error-message" role="alert">{settingsError} <button className="quiet-button" type="button" disabled={settingsBusy} onClick={() => void loadSettings()}>ניסיון נוסף</button></div> : null}

    {candidate ? <section className={styles.proposal} aria-label="בדיקת הצעת השינוי" ref={reviewPanel} tabIndex={-1}>
      <div><b>{candidate.label}</b><p>הצעת שינוי לבדיקה לפני שמירה.</p></div>
      <div className={styles.actions}><button className="secondary-action" type="button" aria-pressed={!showOriginal} onClick={() => setShowOriginal(false)}>הצעה</button><button className="secondary-action" type="button" aria-pressed={showOriginal} onClick={() => setShowOriginal(true)}>לפני השינוי</button><button className="generate-plan-button" disabled={disabled || Boolean(candidateLock)} onClick={() => void change({ mode: 'apply', sourceVersionId: candidate.id })}>אישור ושמירת הטיוטה</button><button className="quiet-button" disabled={busy} onClick={() => { setCandidate(null); setShowOriginal(false); setMessage('ההצעה בוטלה בתצוגה. הטיוטה הקודמת נשמרה.'); }}>ביטול</button></div>
      {candidateLock ? <p className={styles.note}>{candidateLock}</p> : null}
    </section> : null}

    {!curated ? <div className={styles.comparison} data-reference={Boolean(settings?.referenceAssetId)}>
      {settings?.referenceAssetId ? <aside className={styles.reference}>
        <div><b>תמונת ההשראה</b><span>פרטית · לבדיקת הכיוון</span></div>
        {referenceFailed ? <p className={styles.note}>לא הצלחנו להציג את ההשראה. אפשר להחליף אותה בהגדרות היצירה.</p> : referenceUrl ? <img src={referenceUrl} alt="תמונת ההשראה הפרטית שנבחרה לעיצוב האתר" onError={() => setReferenceFailed(true)} /> : <p className={styles.note}>טוענים תמונת השראה…</p>}
        <p className={styles.note}>השוו את המבנה, הצבעים והתחושה. האתר מותאם לתוכן העסק ולמובייל.</p>
      </aside> : null}
      <div className={`workbench-preview ${styles.preview}`}><div className={styles.previewHeading}><b>{candidate && !showOriginal ? 'הצעת השינוי' : 'הטיוטה השמורה'}</b><a href={`/dashboard/projects/${projectId}/preview?version=${shownVersion}`} target="_blank" rel="noreferrer">פתיחה בגודל מלא ↗</a></div><PreviewViewport><SiteRenderer plan={shown} projectId={projectId} versionId={shownVersion} compact /></PreviewViewport></div>
    </div> : null}

    {!curated ? <>
      <details className={styles.secondaryEditor}><summary>אפשרויות מתקדמות — נעילת תוכן או עיצוב</summary><section className={styles.locks} aria-label="נעילת החלטות">
        <div><h3>מרוצים מחלק מהאתר?</h3><p>נעלו אותו בזמן שאתם מדייקים את החלק השני.</p></div>
        <div className={styles.actions}><button className={styles.lockButton} type="button" aria-pressed={Boolean(settings?.locks.design)} disabled={disabled} onClick={() => void toggleLock('design')}>{settings?.locks.design ? 'העיצוב נעול · ביטול נעילה' : 'נעילת העיצוב'}</button><button className={styles.lockButton} type="button" aria-pressed={Boolean(settings?.locks.text)} disabled={disabled} onClick={() => void toggleLock('text')}>{settings?.locks.text ? 'התוכן נעול · ביטול נעילה' : 'נעילת התוכן'}</button></div>
        {!settings && !settingsError ? <p className={styles.note} role="status">טוענים את אפשרויות העריכה…</p> : null}
      </section></details>

      <div className={styles.actions}><button type="button" className="secondary-action" onClick={() => { setEditTab('text'); setEditorOpen(true); }}>שינוי טקסט</button><button type="button" className="secondary-action" onClick={() => { setEditTab('design'); setEditorOpen(true); }}>שינוי עיצוב ותמונות</button></div>
      <section id="site-editor" hidden={!editorOpen} className={styles.editor} aria-label="עריכת האתר">
        <div className={styles.editorHeading}><div><h3>מדייקים את האתר</h3><p>בחרו מקטע והכינו הצעה לשינוי.</p></div><div className={styles.tabs} aria-label="סוג העריכה"><button type="button" aria-pressed={editTab === 'text'} onClick={() => setEditTab('text')}>תוכן וטקסט</button><button type="button" aria-pressed={editTab === 'design'} onClick={() => setEditTab('design')}>עיצוב ותמונות</button></div></div>
        <label className="field">באיזה חלק מטפלים?<select value={selected} disabled={busy} onChange={event => setSelected(event.target.value)}><option value="site-header">פתיחת האתר והכפתור הראשי</option>{plan.sections.filter(item => item.kind !== 'hero' && item.kind !== 'contact').map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
        {(editTab === 'text' && settings?.locks.text) || (editTab === 'design' && settings?.locks.design) ? <p className={styles.lockNotice}>החלק הזה נעול. בטלו את הנעילה למעלה כדי לערוך אותו.</p> : null}

        {editTab === 'text' ? <>
          <div className={styles.editorGrid}>
            <form key={`text-${versionId}-${selected}`} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void change({ mode: 'section', sectionId: selected, headline: form.get('headline'), body: form.get('body'), cta: form.get('cta') }, `טקסט · ${section.label}`); }}>
              <fieldset disabled={textDisabled}><legend>עריכה ישירה</legend><label className="field">כותרת<input name="headline" defaultValue={section.headline} maxLength={180} required /></label><label className="field">תוכן<textarea name="body" defaultValue={section.body} maxLength={1200} required /></label><label className="field">טקסט הכפתור<input name="cta" defaultValue={section.cta} maxLength={100} required={editingHeader} /></label><button className="secondary-button">הצגת הטקסט החדש</button></fieldset>
            </form>
            <form key={`rewrite-${selected}`} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void change({ mode: 'rewrite', sectionId: selected, instruction: form.get('instruction'), consent: form.get('consent') === 'on' }, `שיפור טקסט · ${section.label}`); }}>
              <fieldset disabled={textDisabled}><legend>שיפור הטקסט עם AI</legend><label className="field">מה לשנות ב״{section.label}״?<textarea name="instruction" required minLength={3} maxLength={600} placeholder="למשל: קצרו לשתי פסקאות והדגישו את השירות האישי" /></label><p className={styles.note}>השינוי יחול על הטקסט במקטע שנבחר. העיצוב ושאר המקטעים יישמרו.</p><label className="checkbox"><input name="consent" type="checkbox" required />מאשר/ת לשלוח את המקטע והבקשה ל־Gemini.</label><button className="form-button">{busy ? 'מכינים הצעה…' : 'הכנת הצעת טקסט'}</button></fieldset>
            </form>
          </div>
          <details className={styles.secondaryEditor}><summary>תוצאות חיפוש ותיאורים לתמונות</summary>
            <form key={`seo-${versionId}`} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void change({ mode: 'seo', title: form.get('title'), description: form.get('description') }, 'תיאור האתר בחיפוש'); }}><fieldset disabled={textDisabled}><legend>איך האתר מוצג בחיפוש</legend><label className="field">כותרת<input name="title" defaultValue={plan.seo.title} maxLength={160} required /></label><label className="field">תיאור קצר<textarea name="description" defaultValue={plan.seo.description} maxLength={320} required /></label><button className="secondary-button">בדיקת השינויים</button></fieldset></form>
            {images.map(image => <form key={`alt-${versionId}-${image.id}`} onSubmit={event => { event.preventDefault(); void change({ mode: 'image', imageId: image.id, alt: new FormData(event.currentTarget).get('alt') }, 'תיאור תמונה'); }}><fieldset disabled={textDisabled}><legend>תיאור תמונה</legend><div className={styles.altImage}><img src={`/api/sites/${projectId}/media/${versionId}/${image.id}`} alt={image.alt} loading="lazy" /><label className="field">מה רואים בתמונה?<input name="alt" defaultValue={image.alt} maxLength={180} required /></label></div><button className="secondary-button">בדיקת התיאור</button></fieldset></form>)}
          </details>
        </> : <>
          <form key={`motion-${versionId}`} onSubmit={event => { event.preventDefault(); void change({ mode: 'theme', motion: new FormData(event.currentTarget).get('motion') }, 'תנועה ואנימציות'); }}>
            <fieldset disabled={designDisabled}><legend>תנועה ואנימציות באתר</legend><label className="field">סגנון האנימציה<select name="motion" defaultValue={theme.motion} aria-describedby="editor-motion-help"><option value="off">ללא אנימציות</option><option value="subtle">עדינות — הופעה רכה בגלילה</option><option value="expressive">מודגשות — הופעה עם תנועה קלה</option></select></label><p className={styles.note} id="editor-motion-help">הופעה חד־פעמית בגלילה ותגובות במעבר עכבר. העדפת תנועה מופחתת במכשיר מכבה אותן. השינוי אינו משתמש ב־AI; אשרו את ההצעה ופרסמו כדי לעדכן את האתר שבאוויר.</p><button className="secondary-button">תצוגה מקדימה של האנימציות</button></fieldset>
          </form>
          <div className={styles.editorGrid}>
            <form key={`design-${versionId}-${selected}`} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void change({ mode: 'section-design', sectionId: selected, layout: form.get('layout'), tone: form.get('tone'), imageId: form.get('imageId') }, `עיצוב · ${section.label}`); }}><fieldset disabled={designDisabled}><legend>עיצוב המקטע</legend>
              {!editingHeader ? <><label className="field">מבנה<select name="layout" defaultValue={section.presentation?.layout ?? (theme.layout === 'bento' || theme.layout === 'centered' ? 'cards' : 'split')}><option value="split">תמונה לצד התוכן</option><option value="cards">כרטיס תוכן</option><option value="band">רצועה רחבה</option></select></label><label className="field">רקע<select name="tone" defaultValue={section.presentation?.tone ?? (theme.layout === 'bento' || theme.layout === 'centered' ? 'muted' : 'default')}><option value="default">רקע האתר</option><option value="muted">רקע עדין</option><option value="accent">הצבע המוביל</option></select></label></> : <p className={styles.note}>מבנה פתיחת האתר נקבע בכיוון העיצובי הכללי למטה.</p>}
              <label className="field">תמונה במקטע<select name="imageId" defaultValue={section.imageId || ''}><option value="">ללא תמונה</option>{images.filter(image => image.role !== 'logo').map(image => <option key={image.id} value={image.id}>{image.alt}</option>)}</select></label><button className="secondary-button">הצגת העיצוב החדש</button></fieldset></form>
            {!editingHeader ? <form key={`redesign-${selected}`} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void change({ mode: 'redesign', sectionId: selected, instruction: form.get('instruction'), consent: form.get('consent') === 'on' }, `עיצוב ממוקד · ${section.label}`); }}><fieldset disabled={designDisabled}><legend>שינוי עיצוב עם AI</legend><label className="field">איך לעצב את ״{section.label}״?<textarea name="instruction" required minLength={3} maxLength={600} placeholder="למשל: הציגו ככרטיס בולט עם רקע בצבע המותג" /></label><p className={styles.note}>ההצעה תשנה את מבנה ורקע המקטע. התוכן ושאר האתר יישמרו.</p><label className="checkbox"><input name="consent" type="checkbox" required />מאשר/ת לשלוח את המקטע, הכיוון העיצובי והבקשה ל־Gemini.</label><button className="form-button">{busy ? 'מכינים הצעה…' : 'הכנת הצעת עיצוב'}</button></fieldset></form> : <div className={styles.explainer}><b>שינוי מדויק בכל מקטע</b><p>בחרו מקטע תוכן כדי לבקש הצעת עיצוב ממוקדת עם AI.</p></div>}
          </div>
          <details className={styles.secondaryEditor}><summary>הכיוון העיצובי של האתר כולו</summary><form key={`theme-${versionId}`} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void change({ mode: 'theme', layout: form.get('layout'), accent: form.get('accent'), colorMode: form.get('colorMode'), density: form.get('density'), font: form.get('font'), corners: form.get('corners') }, 'הכיוון העיצובי של האתר'); }}><fieldset disabled={designDisabled}><legend>מבנה, צבעים ואופי</legend><div className={styles.editorGrid}>
            <label className="field">מבנה<select name="layout" defaultValue={theme.layout}><option value="split">תמונה לצד הסיפור</option><option value="editorial">כותרת גדולה ותמונה רחבה</option><option value="centered">מרכזי עם כרטיסי תוכן</option><option value="immersive">פתיחה עם צילום רחב</option><option value="bento">פסיפס כרטיסים</option></select></label><label className="field">צבע מוביל<input name="accent" type="color" defaultValue={theme.accent} /></label><label className="field">בהירות<select name="colorMode" defaultValue={theme.mode}><option value="light">בהיר</option><option value="dark">כהה</option></select></label><label className="field">ריווח<select name="density" defaultValue={theme.density}><option value="airy">מרווח</option><option value="compact">צפוף יותר</option></select></label><label className="field">סגנון אותיות<select name="font" defaultValue={theme.font}><option value="modern">מודרני</option><option value="editorial">מערכתי</option></select></label><label className="field">פינות<select name="corners" defaultValue={theme.corners}><option value="soft">מעוגלות</option><option value="square">ישרות</option></select></label>
          </div><p className={styles.note}>הצבע המוביל מותאם לקריאות הטקסט. השינוי יוצג לבדיקה בכל האתר.</p><button className="secondary-button">הצגת הכיוון החדש</button></fieldset></form></details>
          {images.some(image => image.role !== 'logo') ? <details className={styles.secondaryEditor}><summary>מיקוד וחיתוך תמונות במחשב ובמובייל</summary>{images.filter(image => image.role !== 'logo').map(image => <FocalEditor key={`${versionId}-${image.id}`} image={image} projectId={projectId} versionId={versionId} disabled={designDisabled} change={change} />)}</details> : null}
        </>}
      </section>
    </> : null}

    <section className={styles.quality} aria-label="מוכנות לפרסום"><div><h3>עוברים על האתר לפני הפרסום</h3><p>בדיקות בסיסיות של התוכן והמבנה {candidate && !showOriginal ? 'בהצעה המוצגת' : 'בטיוטה השמורה'}.</p></div><ul className="launch-checks">{checks.map(check => <li key={check.label}><span>{check.ok ? '✓' : 'כדאי להשלים'}</span>{check.label}</li>)}</ul>
      <div className={styles.contactSummary}><b>פרטי הקשר בגרסה הזו</b><p>{shown.business?.phone || 'לא נוסף טלפון'} · {shown.business?.email || 'לא נוסף אימייל'}</p>
        {!curated ? <details className={styles.secondaryEditor}><summary>עדכון פרטי הקשר בטיוטה</summary><form key={`contact-${versionId}`} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void change({ mode: 'contact', phone: form.get('phone'), email: form.get('email'), whatsapp: form.get('whatsapp') === 'on', contactPreference: form.get('contactPreference') }, 'פרטי הקשר והכפתור הראשי'); }}><fieldset disabled={textDisabled}><legend>איך פונים לעסק</legend><div className={styles.editorGrid}><label className="field">טלפון<input name="phone" type="tel" dir="ltr" defaultValue={plan.business?.phone} /></label><label className="field">אימייל<input name="email" type="email" dir="ltr" defaultValue={plan.business?.email} /></label></div><label className="checkbox"><input name="whatsapp" type="checkbox" defaultChecked={Boolean(plan.business?.whatsapp)} />המספר מחובר ל־WhatsApp ואפשר לפרסם קישור אליו.</label><label className="field">הפעולה הראשית<select name="contactPreference" defaultValue={plan.contactPreference ?? 'form'}><option value="whatsapp">שליחת הודעה ב־WhatsApp</option><option value="phone">שיחת טלפון</option><option value="email">שליחת אימייל</option><option value="form">טופס פנייה</option></select></label><button className="secondary-button">בדיקת פרטי הקשר החדשים</button><p className={styles.note}>השינוי יישמר בגרסת האתר אחרי אישור ההצעה. פרטי הבריף ליצירה חדשה נערכים בנפרד.</p></fieldset></form></details> : <a href={`/dashboard/projects/${projectId}/edit`}>עריכת פרטי העסק בבריף</a>}
      </div>
      {shown.missingInformation?.length ? <details className={styles.missing}><summary>מידע שכדאי לוודא או להשלים ({shown.missingInformation.length})</summary><p className={styles.note}>הנקודות זוהו בזמן היצירה; בדקו אילו מהן עדיין רלוונטיות אחרי העריכה.</p><ul>{shown.missingInformation.map((item, index) => <li key={index}>{item}</li>)}</ul></details> : null}
      <p className={styles.note}>אין כאן בדיקה אוטומטית של דמיון לתמונת ההשראה או בדיקת נגישות מלאה. עברו על תצוגת המחשב והמובייל, וודאו שהמידע נכון, הקישורים נפתחים והתמונות חתוכות היטב.</p>
    </section>

    <details className="workspace-details"><summary>גרסאות קודמות וביטול שינוי</summary><p>כל אישור נשמר כטיוטה חדשה. שחזור ייצור טיוטה מהגרסה שבחרתם, בהתאם לנעילות הפעילות.</p>{previousVersion ? <button className="secondary-button" type="button" disabled={busy} onClick={() => setRestoreId(previousVersion.id)}>חזרה לגרסה הקודמת</button> : null}<ul className="version-history">{savedVersions.map(version => <li key={version.id}><div><b>גרסה {version.version_number}</b> · {new Date(version.created_at).toLocaleDateString('he-IL')}{version.visibility === 'public' ? ' · באוויר' : ''}{version.id === versionId ? ' · הטיוטה הנוכחית' : ''}</div><div><a href={`/dashboard/projects/${projectId}/preview?version=${version.id}`} target="_blank" rel="noreferrer">צפייה</a>{version.id !== versionId ? <button type="button" disabled={busy} onClick={() => setRestoreId(version.id)}>שחזור כטיוטה</button> : null}</div></li>)}</ul>{restoreId ? <div className="publication-confirm"><p>לשחזר את הגרסה שנבחרה כטיוטה? האתר המפורסם יישאר כפי שהוא עד לפרסום נוסף.</p><button className="secondary-button" disabled={disabled} onClick={() => { void change({ mode: 'restore', sourceVersionId: restoreId }); setRestoreId(''); }}>שחזור כטיוטה</button><button className="quiet-button" onClick={() => setRestoreId('')}>ביטול</button></div> : null}
      {versions.some(version => version.visibility === 'preview') ? <><h3>הצעות שנשמרו לבדיקה</h3><p className={styles.note}>אפשר לאשר רק הצעה שהוכנה מתוך הטיוטה הנוכחית.</p><ul className="version-history">{versions.filter(version => version.visibility === 'preview').slice(0, 5).map(version => <li key={version.id}><a href={`/dashboard/projects/${projectId}/preview?version=${version.id}`} target="_blank" rel="noreferrer">הצעה {version.version_number} ↗</a><button type="button" disabled={disabled} onClick={() => void change({ mode: 'apply', sourceVersionId: version.id })}>אישור ושמירה כטיוטה</button></li>)}</ul></> : null}
    </details>
  </div>;
}
