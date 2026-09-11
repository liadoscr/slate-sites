'use client';

import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf', 'video/mp4']);
const maxBytes = 20 * 1024 * 1024;

type NewProjectBriefFormProps = { userId: string };

function safeFilename(filename: string) {
  return filename.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'asset';
}

export function NewProjectBriefForm(_props: NewProjectBriefFormProps) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const projectId = useRef<string | null>(null);
  const uploadProgress = useRef(new Map<string, { id:string; path:string; uploaded:boolean; saved:boolean }>());

  function chooseFiles(selected: FileList | null) {
    const nextFiles = Array.from(selected ?? []);
    const invalid = nextFiles.find((file) => !allowedTypes.has(file.type) || file.size > maxBytes);
    if (invalid) { setError(`הקובץ ${invalid.name} אינו בפורמט נתמך או גדול מ־20MB.`); return; }
    setError(''); setFiles(nextFiles);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const businessName = String(form.get('businessName') || '').trim();
    const designUrl = String(form.get('designUrl') || '').trim();
    const designNotes = String(form.get('designNotes') || '').trim();
    const hasRights = form.get('rights') === 'on';

    if (businessName.length < 2) { setError('הוסיפו שם עסק כדי לשמור את הפרויקט.'); return; }
    if (files.length && !hasRights) { setError('כדי להעלות קבצים, אשרו שיש לכם זכות להשתמש בהם.'); return; }

    setBusy(true); setError('');
    try {
      let referenceUrl = '';
      if (designUrl) {
        let parsed: URL;
        try { parsed = new URL(designUrl); } catch { throw new Error('קישור ההשראה אינו כתובת אינטרנט תקינה.'); }
        if (parsed.protocol !== 'https:') throw new Error('קישור ההשראה חייב להתחיל ב־https://');
        referenceUrl = parsed.toString();
      }
      const supabase = createClient();
      projectId.current ??= crypto.randomUUID();
      const project = {id:projectId.current};
      const response = await fetch('/api/projects/brief',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...Object.fromEntries(form),projectId:project.id,designUrl:referenceUrl,designNotes})});
      const result = await response.json();
      if(!response.ok)throw new Error(result.error || 'לא הצלחנו לשמור את הבריף.');

      for (const file of files) {
        const key=`${file.name}-${file.size}-${file.lastModified}`;
        let progress=uploadProgress.current.get(key);
        if(!progress){const id=crypto.randomUUID();progress={id,path:`${project.id}/${id}-${safeFilename(file.name)}`,uploaded:false,saved:false};uploadProgress.current.set(key,progress);}
        if(!progress.uploaded){const { error: uploadError } = await supabase.storage.from('project-assets').upload(progress.path, file, { cacheControl: '3600', upsert: false, contentType: file.type });if (uploadError) throw uploadError;progress.uploaded=true;}
        if(!progress.saved){const { error: assetError } = await supabase.from('project_assets').upsert({ id:progress.id,project_id: project.id, storage_path: progress.path, original_name: file.name, mime_type: file.type, size_bytes: file.size },{onConflict:'id'});if (assetError) throw assetError;progress.saved=true;}
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
      <h2>נכיר את העסק שלך</h2><p>לא חייבים לסיים הכול עכשיו. שומרים את הבריף, וממשיכים ליצירת התוכן מתוך הפרויקט.</p>
      <fieldset className="brief-group"><legend><span>01</span>העסק והסיפור</legend>
      <div className="field-grid">
        <label className="field">שם העסק<input name="businessName" required placeholder="למשל: סטודיו אבן" /></label>
        <label className="field">תחום העסק<input name="businessType" placeholder="למשל: אדריכלות פנים" /></label>
        <label className="field full">אזור פעילות<input name="location" placeholder="למשל: תל אביב והסביבה" /></label>
        <label className="field">טלפון שיופיע באתר<input name="contactPhone" type="tel" dir="ltr" placeholder="0501234567" /></label>
        <label className="field">אימייל שיופיע באתר<input name="contactEmail" type="email" dir="ltr" placeholder="hello@business.co.il" /><small>התראות על פניות יישלחו לאימייל המאומת של החשבון.</small></label>
        <label className="field full">ספרו על העסק<textarea name="businessStory" placeholder="מה אתם עושים, למי, ומה מיוחד אצלכם?" /></label>
        <label className="field full">מה הפעולה החשובה באתר?<input name="primaryGoal" placeholder="למשל: קביעת שיחת ייעוץ או השארת פרטים" /></label>
      </div></fieldset>
      <fieldset className="brief-group"><legend><span>02</span>הכיוון העיצובי</legend>
      <div className="field-grid">
        <label className="field full">קישור להשראה ב־Dribbble<input name="designUrl" type="url" inputMode="url" placeholder="https://dribbble.com/shots/..." /><small>מחפשים השראה? <a className="inline-link" href="https://dribbble.com/search/web-design" target="_blank" rel="noreferrer">לעיון בעיצובים של אתרים ב־Dribbble ↗</a></small><small>הקישור משמש להשראה בלבד. אנחנו לא מעתיקים עיצובים, תוכן או נכסים של יוצרים אחרים.</small></label>
        <label className="field full">איזה כיוון עיצובי מתאים לכם?<textarea name="designNotes" placeholder="למשל: כותרת גדולה, צילום רחב ועיצוב אלגנטי. אפשר לכתוב גם ללא קישור." /><small>ה־AI לא פותח את קישור Dribbble. אפשר להעלות תמונת השראה ולבחור אותה בשלב היצירה.</small></label>
        <label className="field">אופי האתר<select name="tone" defaultValue=""><option value="">בחרו אופי</option><option>נקי ומקצועי</option><option>חם ואישי</option><option>נועז וחדשני</option><option>אלגנטי ומדויק</option></select></label>
        <label className="field">צבעים שאוהבים<input name="colors" placeholder="למשל: כחול, לבן וסגול" /></label>
      </div></fieldset>
      <fieldset className="brief-group"><legend><span>03</span>התוכן והחומרים</legend>
      <div className="field-grid">
        <label className="field full">טקסטים ותוכן לאתר<textarea name="websiteCopy" placeholder="שירותים, יתרונות, המלצות, שאלות נפוצות או כל טקסט שחייב להופיע באתר" /></label>
        <label className="field full">קישורים שחשוב לכלול<input name="importantLinks" placeholder="Instagram, WhatsApp, Google Maps, קטלוג..." /></label>
      </div>
      <div className="asset-uploader"><b>תמונות, לוגו וקבצים</b><p>JPG, PNG, WebP, AVIF, PDF או MP4 עד 20MB לכל קובץ.</p><input aria-label="העלאת תמונות וקבצים" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,application/pdf,video/mp4" onChange={(event) => chooseFiles(event.target.files)} />
        {files.length ? <ul className="file-list">{files.map((file) => <li key={`${file.name}-${file.size}`}><b>{file.name}</b><span>{Math.ceil(file.size / 1024)}KB</span></li>)}</ul> : null}
      </div>
      <label className="checkbox"><input name="rights" type="checkbox" />אני מאשר/ת שיש לי זכות להשתמש בתמונות, בטקסטים ובנכסים שהעליתי.</label>
      </fieldset>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <div className="form-actions"><button className="form-button" disabled={busy} type="submit">{busy ? 'שומרים…' : 'שמירת הבריף והמשך'}</button><span className="small-print">האתר לא מתפרסם בשלב הזה.</span></div>
    </form>
  );
}
