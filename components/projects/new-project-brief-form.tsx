'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf', 'video/mp4']);
const maxBytes = 20 * 1024 * 1024;

type NewProjectBriefFormProps = { userId: string };

function safeFilename(filename: string) {
  return filename.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'asset';
}

export function NewProjectBriefForm({ userId }: NewProjectBriefFormProps) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [intent, setIntent] = useState<'draft' | 'submitted'>('draft');

  function chooseFiles(selected: FileList | null) {
    const nextFiles = Array.from(selected ?? []);
    const invalid = nextFiles.find((file) => !allowedTypes.has(file.type) || file.size > maxBytes);
    if (invalid) { setError(`הקובץ ${invalid.name} אינו בפורמט נתמך או גדול מ־20MB.`); return; }
    setError(''); setFiles(nextFiles);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submissionIntent = form.get('intent') === 'submitted' ? 'submitted' : 'draft';
    const businessName = String(form.get('businessName') || '').trim();
    const designUrl = String(form.get('designUrl') || '').trim();
    const designNotes = String(form.get('designNotes') || '').trim();
    const websiteCopy = String(form.get('websiteCopy') || '').trim();
    const hasRights = form.get('rights') === 'on';

    if (businessName.length < 2) { setError('הוסיפו שם עסק כדי לשמור את הפרויקט.'); return; }
    if (submissionIntent === 'submitted' && !designUrl && !designNotes) { setError('לפני שליחה לבדיקה, הוסיפו קישור להשראה או תיאור של הכיוון העיצובי.'); return; }
    if (submissionIntent === 'submitted' && designUrl && designNotes.length < 12) { setError('כדי שהכיוון יהיה קרוב להשראה, כתבו בכמה מילים מה בדיוק אהבתם בעיצוב.'); return; }
    if (submissionIntent === 'submitted' && !files.length && !websiteCopy) { setError('לפני שליחה לבדיקה, העלו קובץ אחד לפחות או הוסיפו תוכן לאתר.'); return; }
    if (submissionIntent === 'submitted' && !hasRights) { setError('לפני שליחה לבדיקה, אשרו שיש לכם זכות להשתמש בחומרים.'); return; }

    setBusy(true); setError('');
    try {
      const supabase = createClient();
      const { data: project, error: projectError } = await supabase.from('projects').insert({
        owner_id: userId,
        business_name: businessName,
        business_type: String(form.get('businessType') || '').trim() || null,
        location: String(form.get('location') || '').trim() || null,
        status: submissionIntent,
      }).select('id').single();
      if (projectError || !project) throw projectError || new Error('לא הצלחנו ליצור פרויקט.');

      const { error: briefError } = await supabase.from('project_briefs').insert({
        project_id: project.id,
        business_story: String(form.get('businessStory') || '').trim() || null,
        primary_goal: String(form.get('primaryGoal') || '').trim() || null,
        website_copy: websiteCopy || null,
        important_links: String(form.get('importantLinks') || '').trim() || null,
        tone: String(form.get('tone') || '').trim() || null,
        color_preference: String(form.get('colors') || '').trim() || null,
        submitted_at: submissionIntent === 'submitted' ? new Date().toISOString() : null,
      });
      if (briefError) throw briefError;

      if (designUrl) {
        let parsed: URL;
        try { parsed = new URL(designUrl); } catch { throw new Error('קישור ההשראה אינו כתובת אינטרנט תקינה.'); }
        if (parsed.protocol !== 'https:') throw new Error('קישור ההשראה חייב להתחיל ב־https://');
        const { error: referenceError } = await supabase.from('design_references').insert({ project_id: project.id, url: parsed.toString(), notes: designNotes || null });
        if (referenceError) throw referenceError;
      }

      for (const file of files) {
        const path = `${project.id}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
        const { error: uploadError } = await supabase.storage.from('project-assets').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;
        const { error: assetError } = await supabase.from('project_assets').insert({ project_id: project.id, storage_path: path, original_name: file.name, mime_type: file.type, size_bytes: file.size });
        if (assetError) throw assetError;
      }

      router.replace(`/dashboard/projects/${project.id}`);
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'לא הצלחנו לשמור את הבריף. נסו שוב.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel brief-form" onSubmit={submit} noValidate>
      <h2>פרטי הבריף</h2><p>אפשר לשמור טיוטה בכל שלב. שליחה לבדיקה מסמנת לצוות שהחומרים מוכנים.</p>
      <div className="field-grid">
        <label className="field">שם העסק<input name="businessName" required placeholder="למשל: סטודיו אבן" /></label>
        <label className="field">תחום העסק<input name="businessType" placeholder="למשל: אדריכלות פנים" /></label>
        <label className="field full">אזור פעילות<input name="location" placeholder="למשל: תל אביב והסביבה" /></label>
        <label className="field full">ספרו על העסק<textarea name="businessStory" placeholder="מה אתם עושים, למי, ומה מיוחד אצלכם?" /></label>
        <label className="field full">מה הפעולה החשובה באתר?<input name="primaryGoal" placeholder="למשל: קביעת שיחת ייעוץ או השארת פרטים" /></label>
        <label className="field full">קישור להשראה ב־Dribbble<input name="designUrl" type="url" inputMode="url" placeholder="https://dribbble.com/shots/..." /><small>מחפשים השראה? <a className="inline-link" href="https://dribbble.com/search/web-design" target="_blank" rel="noreferrer">לעיון בעיצובים של אתרים ב־Dribbble ↗</a></small><small>הקישור משמש להשראה בלבד. אנחנו לא מעתיקים עיצובים, תוכן או נכסים של יוצרים אחרים.</small></label>
        <label className="field full">מה רוצים לקחת מההשראה? <span className="required-hint">(חשוב ל־AI)</span><textarea name="designNotes" placeholder="למשל: פתיחה כהה עם כותרת גדולה, הרבה מרווח לבן, כרטיסי שירות בהירים, תמונות גדולות, כחול עמוק וסגול. לא רוצים אנימציות." /><small>ה־AI לא פותח את קישור Dribbble. התיאור שלכם הוא מה שמתרגם את ההשראה לכיוון מקורי לאתר.</small></label>
        <label className="field">אופי האתר<select name="tone" defaultValue=""><option value="">בחרו אופי</option><option>נקי ומקצועי</option><option>חם ואישי</option><option>נועז וחדשני</option><option>אלגנטי ומדויק</option></select></label>
        <label className="field">צבעים שאוהבים<input name="colors" placeholder="למשל: כחול, לבן וסגול" /></label>
        <label className="field full">טקסטים ותוכן לאתר<textarea name="websiteCopy" placeholder="שירותים, יתרונות, המלצות, שאלות נפוצות או כל טקסט שחייב להופיע באתר" /></label>
        <label className="field full">קישורים שחשוב לכלול<input name="importantLinks" placeholder="Instagram, WhatsApp, Google Maps, קטלוג..." /></label>
      </div>
      <div className="asset-uploader"><b>תמונות, לוגו וקבצים</b><p>JPG, PNG, WebP, AVIF, PDF או MP4 עד 20MB לכל קובץ.</p><input aria-label="העלאת תמונות וקבצים" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,application/pdf,video/mp4" onChange={(event) => chooseFiles(event.target.files)} />
        {files.length ? <ul className="file-list">{files.map((file) => <li key={`${file.name}-${file.size}`}><b>{file.name}</b><span>{Math.ceil(file.size / 1024)}KB</span></li>)}</ul> : null}
      </div>
      <label className="checkbox"><input name="rights" type="checkbox" />אני מאשר/ת שיש לי זכות להשתמש בתמונות, בטקסטים ובנכסים שהעליתי.</label>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <button className="form-button" name="intent" value="submitted" onClick={() => setIntent('submitted')} disabled={busy} type="submit">{busy && intent === 'submitted' ? 'שולחים…' : 'שמירה ושליחה לבדיקה'}</button>
      <button className="secondary-button" name="intent" value="draft" onClick={() => setIntent('draft')} disabled={busy} type="submit">{busy && intent === 'draft' ? 'שומרים…' : 'שמירת טיוטה'}</button>
    </form>
  );
}
